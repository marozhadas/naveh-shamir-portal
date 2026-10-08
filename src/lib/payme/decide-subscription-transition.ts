import { computeGracePeriodEnd } from "@/domain/subscription-grace-period";
import { agorotFromIls, type PayMeSubStatus } from "./payme-helpers";
import type { SubscriptionStatus } from "@/types/subscription";
import type { BillingTransactionKind, BillingTransactionStatus } from "@/types/billing";

/**
 * PURE decision: given the local subscription and what PayMe itself reports (read back from PayMe's API,
 * not taken from the callback body), what must change locally? No I/O here — the webhook processor applies
 * the result. Statuses used are the existing ones: trialing, active, past-due, grace-period, canceled,
 * expired. A failed charge starts the 7-day grace period (the business stays live); a paid iteration
 * clears it; cancel keeps access through the period already paid for.
 */
export type LocalSubscriptionForTransition = {
  status: SubscriptionStatus;
  billingInterval: "monthly" | "yearly" | null;
  priceAmountIls: number | null;
  trialEndsAt: string | null;
  paymentFailedAt: string | null;
  gracePeriodEndsAt: string | null;
  lastPaymentSucceededAt: string | null;
  currentPeriodEndsAt: string | null;
};

export type VerifiedPayMeSubscription = {
  status: PayMeSubStatus;
  iterationsCompleted: number;
  /** PayMe's own price for one iteration, in agorot. */
  priceAgorot: number | null;
  /** When the latest iteration was paid, as reported by PayMe (null if not reported). */
  paymentDate: Date | null;
  /** PayMe's error text for a failed attempt (e.g. "Failed, pending automatic retry"). */
  errorText: string | null;
};

export type TransitionContext = {
  now: Date;
  subPaymeId: string;
  /** A transaction/sale id the callback itself carried, if any. */
  callbackTransactionId: string | null;
  /** Stable per-callback key (the idempotency hash) — distinguishes separate failed attempts. */
  eventKey: string;
};

export type SubscriptionPatch = {
  status?: SubscriptionStatus;
  payment_failed_at?: string | null;
  grace_period_ends_at?: string | null;
  last_payment_succeeded_at?: string | null;
  last_payment_failed_at?: string | null;
  payment_failure_reason?: string | null;
  provider_last_transaction_id?: string | null;
  current_period_started_at?: string | null;
  current_period_ends_at?: string | null;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
};

export type BusinessEventType = "subscription_activated" | "payment_recovered" | "payment_failed" | "subscription_canceled";

export type TransitionDecision =
  | { kind: "no-change"; reason: string }
  | {
      kind: "payment-succeeded" | "payment-failed" | "canceled";
      patch: SubscriptionPatch;
      transaction: {
        providerTransactionId: string;
        kind: BillingTransactionKind;
        status: BillingTransactionStatus;
        amountAgorot: number;
        occurredAt: string;
        failureReason: string | null;
      } | null;
      businessEvent: BusinessEventType | null;
      /** True when the paid tier must be (re)activated on the business. */
      activatePlan: boolean;
    };

function addInterval(from: Date, interval: "monthly" | "yearly" | null): Date | null {
  if (!interval) return null;
  const next = new Date(from.getTime());
  if (interval === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

function safeReason(text: string | null): string | null {
  if (!text) return null;
  // Only a short, plain description is ever stored/shown — never anything resembling an identifier.
  const trimmed = text.replace(/\s+/g, " ").trim().slice(0, 160);
  return trimmed.length > 0 ? trimmed : null;
}

export function decideSubscriptionTransition(local: LocalSubscriptionForTransition, verified: VerifiedPayMeSubscription, ctx: TransitionContext): TransitionDecision {
  const nowIso = ctx.now.toISOString();
  const amountAgorot = verified.priceAgorot ?? (local.priceAmountIls !== null ? agorotFromIls(local.priceAmountIls) : 0);

  if (verified.status === "active" && verified.iterationsCompleted >= 1) {
    const paidAt = verified.paymentDate ?? ctx.now;
    const periodEnd = addInterval(paidAt, local.billingInterval);
    const first = verified.iterationsCompleted <= 1;
    const wasInTrouble = local.status === "grace-period" || local.status === "past-due" || local.status === "expired";
    return {
      kind: "payment-succeeded",
      patch: {
        status: "active",
        payment_failed_at: null,
        grace_period_ends_at: null,
        payment_failure_reason: null,
        last_payment_succeeded_at: paidAt.toISOString(),
        current_period_started_at: paidAt.toISOString(),
        current_period_ends_at: periodEnd ? periodEnd.toISOString() : null,
        cancel_at_period_end: false,
        canceled_at: null,
        provider_last_transaction_id: ctx.callbackTransactionId ?? `${ctx.subPaymeId}:iter:${verified.iterationsCompleted}`,
      },
      transaction: {
        providerTransactionId: ctx.callbackTransactionId ?? `${ctx.subPaymeId}:iter:${verified.iterationsCompleted}`,
        kind: first ? "charge" : "renewal",
        status: "succeeded",
        amountAgorot,
        occurredAt: paidAt.toISOString(),
        failureReason: null,
      },
      businessEvent: local.status === "trialing" ? "subscription_activated" : wasInTrouble ? "payment_recovered" : null,
      activatePlan: true,
    };
  }

  if (verified.status === "failed" || verified.status === "failed-retrying") {
    if (local.status === "canceled" || local.status === "expired") return { kind: "no-change", reason: "subscription-already-ended" };

    const alreadyInTrouble = local.status === "grace-period" || local.status === "past-due";
    const reason = safeReason(verified.errorText);
    const failedTransactionId = ctx.callbackTransactionId ?? `${ctx.subPaymeId}:fail:${ctx.eventKey.slice(0, 16)}`;
    const patch: SubscriptionPatch = {
      last_payment_failed_at: nowIso,
      payment_failure_reason: reason,
    };
    if (!alreadyInTrouble) {
      // First failure: stamp it and open the 7-day grace period — the page stays live meanwhile.
      patch.status = "grace-period";
      patch.payment_failed_at = nowIso;
      patch.grace_period_ends_at = computeGracePeriodEnd(ctx.now).toISOString();
    }
    return {
      kind: "payment-failed",
      patch,
      transaction: { providerTransactionId: failedTransactionId, kind: "failed", status: "failed", amountAgorot, occurredAt: nowIso, failureReason: reason },
      businessEvent: alreadyInTrouble ? null : "payment_failed",
      activatePlan: false,
    };
  }

  if (verified.status === "canceled") {
    if (local.status === "canceled" || local.status === "expired") return { kind: "no-change", reason: "already-canceled" };
    let accessUntil: string | null = local.currentPeriodEndsAt;
    if (local.status === "trialing") accessUntil = local.trialEndsAt;
    else if (local.lastPaymentSucceededAt) accessUntil = addInterval(new Date(local.lastPaymentSucceededAt), local.billingInterval)?.toISOString() ?? accessUntil;
    return {
      kind: "canceled",
      patch: { status: "canceled", cancel_at_period_end: true, canceled_at: nowIso, current_period_ends_at: accessUntil },
      transaction: null,
      businessEvent: "subscription_canceled",
      activatePlan: false,
    };
  }

  // initial (not yet paid) / completed / unknown — nothing to change locally.
  return { kind: "no-change", reason: `payme-status-${verified.status}` };
}
