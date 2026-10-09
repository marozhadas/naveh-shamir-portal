import { computeGracePeriodEnd } from "@/domain/subscription-grace-period";
import { agorotFromIls } from "./payme-helpers";
import type { SubscriptionStatus } from "@/types/subscription";
import type { BillingTransactionKind, BillingTransactionStatus } from "@/types/billing";

/**
 * PURE decision: given the local subscription and ONE verified callback (see verify-callback.ts), what must change
 * locally? No I/O — the webhook processor applies the result. Statuses used are the existing ones: trialing, active,
 * past-due, grace-period, canceled, expired. A failed charge starts the 7-day grace period (the business stays live);
 * a paid iteration clears it; cancel keeps access through the period already paid for.
 *
 * Trust model: PayMe's subscription callbacks are unsigned and there is no endpoint to read a subscription back, so
 * the ONLY callback field that drives a decision is the documented notify_type. Money never comes from the callback:
 * the amount of a payment is OUR stored price snapshot, the time is our clock, and the optional extras the callback
 * may carry (an iteration counter, a transaction id, an error text) are used only to label/deduplicate, never to
 * decide whether money moved. Anything suspicious becomes "needs-attention": no state change, no revenue.
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

export type PayMeCallbackEvent = {
  /** The documented notify_type: sub-create, sub-active, sub-iteration-success, sub-complete, sub-cancel, sub-failure. */
  notifyType: string;
  /** PayMe's own error text for a failed attempt, when the callback carries one. Display only. */
  errorText: string | null;
  /** The iteration counter, when the callback carries one. Used only to build a stable transaction id. */
  iterationsCompleted: number | null;
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
  /** Looks wrong → nothing changes, no revenue; the event is recorded as failed so an admin sees it under "דורש טיפול". */
  | { kind: "needs-attention"; reason: string }
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

const HOUR_MS = 60 * 60 * 1000;
/** A payment can arrive a little before the stored trial end (clock/timezone rounding) — but not a day early. */
const EARLY_PAYMENT_TOLERANCE_MS = 24 * HOUR_MS;
/**
 * Billing periods are a month or a year, so a second "payment succeeded" within this window of the last recorded one
 * is the SAME charge announced twice (PayMe can send both sub-active and sub-iteration-success for one charge) —
 * never a second payment. This is what keeps revenue from being counted twice when the callback has no charge id.
 */
const SAME_CHARGE_WINDOW_MS = 48 * HOUR_MS;

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

export function decideSubscriptionTransition(local: LocalSubscriptionForTransition, event: PayMeCallbackEvent, ctx: TransitionContext): TransitionDecision {
  const nowIso = ctx.now.toISOString();
  const ended = local.status === "canceled" || local.status === "expired";

  switch (event.notifyType) {
    case "sub-create":
    case "sub-complete":
      return { kind: "no-change", reason: `informational-${event.notifyType}` };

    case "sub-active":
    case "sub-iteration-success": {
      // Revenue is only ever our own snapshot price — without it there is nothing safe to record.
      if (local.priceAmountIls === null) return { kind: "needs-attention", reason: "no-price-snapshot" };
      if (ended) return { kind: "needs-attention", reason: "payment-after-subscription-ended" };
      if (local.status === "trialing" && local.trialEndsAt && ctx.now.getTime() < new Date(local.trialEndsAt).getTime() - EARLY_PAYMENT_TOLERANCE_MS) {
        return { kind: "needs-attention", reason: "payment-reported-during-trial" };
      }
      if (local.lastPaymentSucceededAt && ctx.now.getTime() - new Date(local.lastPaymentSucceededAt).getTime() < SAME_CHARGE_WINDOW_MS) {
        return { kind: "no-change", reason: "duplicate-payment-notification" };
      }

      const first = local.status === "trialing" || !local.lastPaymentSucceededAt;
      const wasInTrouble = local.status === "grace-period" || local.status === "past-due";
      const periodEnd = addInterval(ctx.now, local.billingInterval);
      const transactionId =
        ctx.callbackTransactionId ?? (event.iterationsCompleted && event.iterationsCompleted > 0 ? `${ctx.subPaymeId}:iter:${event.iterationsCompleted}` : `${ctx.subPaymeId}:paid:${nowIso.slice(0, 10)}`);
      return {
        kind: "payment-succeeded",
        patch: {
          status: "active",
          payment_failed_at: null,
          grace_period_ends_at: null,
          payment_failure_reason: null,
          last_payment_succeeded_at: nowIso,
          current_period_started_at: nowIso,
          current_period_ends_at: periodEnd ? periodEnd.toISOString() : null,
          cancel_at_period_end: false,
          canceled_at: null,
          provider_last_transaction_id: transactionId,
        },
        transaction: {
          providerTransactionId: transactionId,
          kind: first ? "charge" : "renewal",
          status: "succeeded",
          amountAgorot: agorotFromIls(local.priceAmountIls),
          occurredAt: nowIso,
          failureReason: null,
        },
        businessEvent: local.status === "trialing" ? "subscription_activated" : wasInTrouble ? "payment_recovered" : null,
        activatePlan: true,
      };
    }

    case "sub-failure": {
      if (ended) return { kind: "no-change", reason: "subscription-already-ended" };
      const alreadyInTrouble = local.status === "grace-period" || local.status === "past-due";
      const reason = safeReason(event.errorText);
      const failedTransactionId = ctx.callbackTransactionId ?? `${ctx.subPaymeId}:fail:${ctx.eventKey.slice(0, 16)}`;
      const patch: SubscriptionPatch = { last_payment_failed_at: nowIso, payment_failure_reason: reason };
      if (!alreadyInTrouble) {
        // First failure: stamp it and open the 7-day grace period — the page stays live meanwhile.
        patch.status = "grace-period";
        patch.payment_failed_at = nowIso;
        patch.grace_period_ends_at = computeGracePeriodEnd(ctx.now).toISOString();
      }
      return {
        kind: "payment-failed",
        patch,
        transaction: {
          providerTransactionId: failedTransactionId,
          kind: "failed",
          status: "failed",
          amountAgorot: local.priceAmountIls !== null ? agorotFromIls(local.priceAmountIls) : 0,
          occurredAt: nowIso,
          failureReason: reason,
        },
        businessEvent: alreadyInTrouble ? null : "payment_failed",
        activatePlan: false,
      };
    }

    case "sub-cancel": {
      if (ended) return { kind: "no-change", reason: "already-canceled" };
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

    default:
      return { kind: "no-change", reason: "unknown-notify-type" };
  }
}
