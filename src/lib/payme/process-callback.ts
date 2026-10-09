import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { getPayMeConfig } from "./config";
import { decideSubscriptionTransition } from "./decide-subscription-transition";
import { computeProviderEventId, parsePayMeCallbackBody, safeCallbackSummary } from "./payme-helpers";
import { verifyCallbackAgainstLocal } from "./verify-callback";
import type { BillingEventRow } from "@/types/billing";

export type ProcessCallbackResult = {
  /** HTTP status to answer PayMe with: 200 = done (or nothing to retry), 503 = please retry later. */
  httpStatus: 200 | 400 | 503;
  outcome: "processed" | "duplicate" | "ignored" | "failed" | "rejected";
};

/**
 * Applies ONE PayMe subscription callback (sub_callback_url).
 *
 * PayMe confirmed the model for Seller accounts: callbacks are unsigned and there is no endpoint to read a
 * subscription back, so authenticity rests on (in this order):
 *   1. our private secret in the callback URL            — checked by the route before this function runs
 *   2. the subscription is one WE stored, found by its exact sub_payme_id
 *   3. seller_payme_id equals PAYME_SELLER_ID
 *   4. sub_payme_id equals the id stored on that row, exactly (and our own subscription_id, if echoed, is that row's)
 *   5. idempotency (below)
 * and only after all of that does anything change. Money never comes from callback fields: a payment is booked at
 * OUR stored price snapshot (see decideSubscriptionTransition). A callback that fails any check — or looks wrong —
 * changes no subscription, records no revenue, and is stored as a failed billing event, which the admin sees under
 * "דורש טיפול".
 *
 *  - idempotent: billing_events is unique on (provider, provider_event_id), a hash of the callback's fields; a
 *    callback that already processed (or was ignored) is acknowledged without re-applying. A previously FAILED or
 *    unfinished one is processed again (that is what PayMe's retry is for).
 *  - revenue is idempotent a second time: billing_transactions is unique on provider_transaction_id, and a second
 *    "payment succeeded" for the same subscription within 48 hours is treated as the same charge, not a new one.
 *  - every failure is recorded on the event row.
 */
export async function processPayMeCallback(rawBody: string): Promise<ProcessCallbackResult> {
  const callback = parsePayMeCallbackBody(rawBody);
  if (!callback.subPaymeId) return { httpStatus: 400, outcome: "rejected" };

  const config = getPayMeConfig();
  if (!config) return { httpStatus: 503, outcome: "failed" };

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
    // 2) Which local subscription is this? Looked up by the exact PayMe id the callback names.
    const { data: sub } = await admin.from("business_subscriptions").select("*").eq("payment_provider", "payme").eq("provider_subscription_id", callback.subPaymeId).maybeSingle();

    // "sub-create" is sent the moment generate-subscription succeeds — before our own row is written — so it is
    // informational and never an alarm. It changes nothing either way.
    if (callback.notifyType === "sub-create") {
      await finish("ignored", { ...(sub ? { business_registration_id: sub.business_registration_id, subscription_id: sub.id } : {}), summary: { ...summary, reason: "informational-sub-create" } });
      return { httpStatus: 200, outcome: "ignored" };
    }

    // 3–4) seller, exact subscription id, and our own id if echoed.
    const verification = verifyCallbackAgainstLocal({
      callback,
      configuredSellerId: config.sellerId,
      local: sub ? { providerSubscriptionId: sub.provider_subscription_id, businessRegistrationId: sub.business_registration_id } : null,
    });
    if (!verification.ok) {
      await finish("failed", { ...(sub ? { business_registration_id: sub.business_registration_id, subscription_id: sub.id } : {}), error: `callback-not-verified: ${verification.reason}` });
      return { httpStatus: 200, outcome: "failed" };
    }
    if (!sub) return { httpStatus: 200, outcome: "failed" }; // unreachable once verified — narrows the type

    // 5) Decide from the verified callback, then apply.
    const iterations = Number(callback.fields.sub_iterations_completed);
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
      {
        notifyType: callback.notifyType ?? "",
        errorText: callback.fields.sub_error_text ?? null,
        iterationsCompleted: Number.isFinite(iterations) && iterations > 0 ? Math.floor(iterations) : null,
      },
      { now: new Date(), subPaymeId: callback.subPaymeId, callbackTransactionId: callback.transactionId, eventKey: providerEventId },
    );

    if (decision.kind === "needs-attention") {
      await finish("failed", { business_registration_id: sub.business_registration_id, subscription_id: sub.id, error: `needs-attention: ${decision.reason}` });
      return { httpStatus: 200, outcome: "failed" };
    }

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
          provider_status: callback.notifyType,
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
