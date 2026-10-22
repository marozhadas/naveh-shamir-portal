import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

/**
 * Rejecting a business that has a SUMIT trial (activateSumitTrialOnApproval) also ENDS that trial: the local subscription row becomes
 * "canceled". It is a local change only - this module imports no payment provider and makes no network call; nothing is charged,
 * refunded or removed at SUMIT (the saved card stays where it is; see docs/sumit-test-business-hide-and-cleanup.md).
 *
 * It applies ONLY to a trial that was never billed - all of:
 *   payment_provider = "sumit", provider_subscription_id is NULL, status = "trialing", no billing transaction for the business,
 *   and no payment fields on the row (last transaction id, last success / failure, payment failure). Anything else that carries
 *   the SUMIT provider (a subscription that was charged, is active, past-due, in grace, paused...) is NOT touched and the caller must
 *   NOT reject the business automatically ("not-eligible"): a human decides, because money may be involved.
 *
 * Other rows are not this module's business: no subscription, a card-less trial (provider NULL) or a PayMe subscription is reported
 * as "none" and left exactly as it is (PayMe has its own cancel path).
 *
 * Re-runnable: a row that is already canceled / expired is "already-ended" (success, nothing written). The update is guarded by the
 * very conditions above, so it can only ever change a row that is still an unbilled SUMIT trial, and the result is verified - a
 * write that changed nothing is never reported as success unless the row is by then ended.
 */

export type CancelSumitTrialResult =
  | { success: true; outcome: "canceled" | "already-ended" | "none" }
  | { success: false; reason: "not-eligible" | "unknown-error" };

/** The database client the cancellation writes through. Injectable so a test can hand it a fake. */
export type SumitTrialCancelClient = Pick<ReturnType<typeof createAdminSupabaseClient>, "from">;

const ENDED = new Set(["canceled", "expired"]);

export async function cancelSumitTrialForRejection(registrationId: string, adminId: string, deps: { admin?: SumitTrialCancelClient; now?: () => Date } = {}): Promise<CancelSumitTrialResult> {
  if (!deps.admin && !isSupabaseAdminConfigured()) return { success: false, reason: "unknown-error" };
  const admin = deps.admin ?? createAdminSupabaseClient();
  const nowIso = (deps.now?.() ?? new Date()).toISOString();

  const { data: sub, error: readError } = await admin
    .from("business_subscriptions")
    .select("id, status, payment_provider, provider_subscription_id, provider_last_transaction_id, last_payment_succeeded_at, last_payment_failed_at, payment_failed_at")
    .eq("business_registration_id", registrationId)
    .maybeSingle();
  if (readError) return { success: false, reason: "unknown-error" };
  if (!sub || sub.payment_provider !== "sumit") return { success: true, outcome: "none" };
  if (ENDED.has(sub.status)) return { success: true, outcome: "already-ended" };

  const neverBilled =
    sub.status === "trialing" &&
    sub.provider_subscription_id === null &&
    sub.provider_last_transaction_id === null &&
    sub.last_payment_succeeded_at === null &&
    sub.last_payment_failed_at === null &&
    sub.payment_failed_at === null;
  if (!neverBilled) return { success: false, reason: "not-eligible" };

  const { data: transactions, error: transactionsError } = await admin.from("billing_transactions").select("id").eq("business_registration_id", registrationId).limit(1);
  if (transactionsError) return { success: false, reason: "unknown-error" };
  if (transactions && transactions.length > 0) return { success: false, reason: "not-eligible" };

  const { data: changed, error: updateError } = await admin
    .from("business_subscriptions")
    .update({ status: "canceled", cancel_at_period_end: false, canceled_at: nowIso, next_billing_at: null })
    .eq("id", sub.id)
    .eq("payment_provider", "sumit")
    .eq("status", "trialing")
    .is("provider_subscription_id", null)
    .select("id");
  if (updateError) return { success: false, reason: "unknown-error" };

  if (!changed || changed.length !== 1) {
    // Nothing changed: either another request ended it a moment ago (fine) or the row is not what we read (not fine).
    const { data: after, error: afterError } = await admin.from("business_subscriptions").select("status").eq("id", sub.id).maybeSingle();
    if (!afterError && after && ENDED.has(after.status)) return { success: true, outcome: "already-ended" };
    return { success: false, reason: "unknown-error" };
  }

  await admin.from("business_events_log").insert({
    business_registration_id: registrationId,
    event_type: "subscription_canceled",
    actor_id: adminId,
    metadata: { provider: "sumit", initiatedBy: "admin-rejection", charged: false },
  });
  return { success: true, outcome: "canceled" };
}
