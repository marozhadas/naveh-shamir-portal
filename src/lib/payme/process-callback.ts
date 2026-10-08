import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { getPayMeSubscription, PayMeError } from "./client";
import { decideSubscriptionTransition } from "./decide-subscription-transition";
import { computeProviderEventId, parsePayMeCallbackBody, safeCallbackSummary } from "./payme-helpers";
import type { BillingEventRow } from "@/types/billing";

export type ProcessCallbackResult = {
  /** HTTP status to answer PayMe with: 200 = done (or nothing to retry), 503 = please retry later. */
  httpStatus: 200 | 400 | 503;
  outcome: "processed" | "duplicate" | "ignored" | "failed" | "rejected";
};

/**
 * Applies ONE PayMe subscription callback. The callback body is only a hint ("something happened to
 * subscription X"): the actual state is read back from PayMe's own API (get-subscriptions) before any
 * local change, so a forged or replayed callback can neither mark a business paid nor fail it.
 *
 *  - idempotent: billing_events is unique on (provider, provider_event_id); a callback that already
 *    processed (or was ignored) is acknowledged without re-applying. A previously FAILED/unfinished one
 *    is processed again (that is what PayMe's retry is for).
 *  - revenue is idempotent a second time: billing_transactions is unique on provider_transaction_id.
 *  - every failure is recorded on the event row (and shows under "דורש טיפול" in the admin).
 */
export async function processPayMeCallback(rawBody: string): Promise<ProcessCallbackResult> {
  const callback = parsePayMeCallbackBody(rawBody);
  if (!callback.subPaymeId) return { httpStatus: 400, outcome: "rejected" };

  const admin = createAdminSupabaseClient();
  const providerEventId = computeProviderEventId(callback.fields);
  const summary = safeCallbackSummary(callback.fields);

  // 1) Record (or find) the event.
  let eventId: string;
  const inserted = await admin
    .from("billing_events")
    .insert({
      provider: "payme",
      provider_event_id: providerEventId,
      event_type: callback.notifyType ?? "unknown",
      provider_subscription_id: callback.subPaymeId,
      status: "received",
      summary,
    })
    .select("id")
    .maybeSingle();

  if (inserted.data) {
    eventId = inserted.data.id;
  } else if (inserted.error?.code === "23505") {
    const existing = await admin.from("billing_events").select("id, status").eq("provider", "payme").eq("provider_event_id", providerEventId).maybeSingle();
    if (!existing.data) return { httpStatus: 503, outcome: "failed" };
    if (existing.data.status === "processed" || existing.data.status === "ignored") return { httpStatus: 200, outcome: "duplicate" };
    eventId = existing.data.id; // failed / unfinished earlier — process it again
  } else {
    console.error("[processPayMeCallback] could not record event:", inserted.error?.message);
    return { httpStatus: 503, outcome: "failed" };
  }

  async function finish(status: BillingEventRow["status"], extra: Partial<BillingEventRow> = {}): Promise<void> {
    await admin
      .from("billing_events")
      .update({ status, processed_at: new Date().toISOString(), ...extra })
      .eq("id", eventId);
  }

  try {
    // 2) Which local subscription is this?
    const { data: sub } = await admin.from("business_subscriptions").select("*").eq("payment_provider", "payme").eq("provider_subscription_id", callback.subPaymeId).maybeSingle();
    if (!sub) {
      await finish("failed", { error: "unknown-subscription" });
      return { httpStatus: 200, outcome: "failed" };
    }

    // 3) Ask PayMe itself what the truth is.
    let verified;
    try {
      verified = await getPayMeSubscription(callback.subPaymeId);
    } catch (error) {
      const message = error instanceof PayMeError ? error.message : "verification-error";
      await finish("failed", { business_registration_id: sub.business_registration_id, subscription_id: sub.id, error: `verification-failed: ${message}`.slice(0, 300) });
      return { httpStatus: 503, outcome: "failed" };
    }
    if (!verified) {
      await finish("failed", { business_registration_id: sub.business_registration_id, subscription_id: sub.id, error: "payme-does-not-know-this-subscription" });
      return { httpStatus: 200, outcome: "failed" };
    }

    // 4) Decide, then apply.
    const decision = decideSubscriptionTransition(
      {
        status: sub.status,
        billingInterval: sub.billing_interval,
        priceAmountIls: sub.price_amount_ils,
        trialEndsAt: sub.trial_ends_at,
        paymentFailedAt: sub.payment_failed_at,
        gracePeriodEndsAt: sub.grace_period_ends_at,
        lastPaymentSucceededAt: sub.last_payment_succeeded_at,
        currentPeriodEndsAt: sub.current_period_ends_at,
      },
      verified,
      { now: new Date(), subPaymeId: callback.subPaymeId, callbackTransactionId: callback.transactionId, eventKey: providerEventId },
    );

    if (decision.kind === "no-change") {
      await finish("ignored", { business_registration_id: sub.business_registration_id, subscription_id: sub.id, summary: { ...summary, reason: decision.reason } });
      return { httpStatus: 200, outcome: "ignored" };
    }

    const { data: registration } = await admin.from("business_registrations").select("business_name, plan_tier, offer_code").eq("id", sub.business_registration_id).maybeSingle();

    if (decision.transaction) {
      const tx = decision.transaction;
      const { error } = await admin.from("billing_transactions").upsert(
        {
          provider: "payme",
          provider_transaction_id: tx.providerTransactionId,
          business_registration_id: sub.business_registration_id,
          business_name: registration?.business_name ?? null,
          subscription_id: sub.id,
          kind: tx.kind,
          status: tx.status,
          amount_agorot: tx.amountAgorot,
          currency: "ILS",
          plan_id: sub.plan_id,
          billing_interval: sub.billing_interval,
          offer_code: sub.offer_code,
          occurred_at: tx.occurredAt,
          failure_reason: tx.failureReason,
          provider_status: verified.status,
        },
        { onConflict: "provider,provider_transaction_id", ignoreDuplicates: true },
      );
      if (error) throw new Error(`transaction-write-failed: ${error.message}`);
    }

    const { error: updateError } = await admin.from("business_subscriptions").update(decision.patch).eq("id", sub.id);
    if (updateError) throw new Error(`subscription-update-failed: ${updateError.message}`);

    if (decision.activatePlan && (sub.plan_id === "plus" || sub.plan_id === "premium")) {
      await admin.from("business_registrations").update({ active_plan_id: sub.plan_id }).eq("id", sub.business_registration_id);
    }

    if (decision.businessEvent) {
      await admin.from("business_events_log").insert({
        business_registration_id: sub.business_registration_id,
        event_type: decision.businessEvent,
        actor_id: null,
        metadata: { provider: "payme", billingEventId: eventId },
      });
    }

    await finish("processed", { business_registration_id: sub.business_registration_id, subscription_id: sub.id });
    return { httpStatus: 200, outcome: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[processPayMeCallback] failed:", message);
    await finish("failed", { error: message.slice(0, 300) });
    return { httpStatus: 503, outcome: "failed" };
  }
}
