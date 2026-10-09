import { describe, expect, it } from "vitest";
import {
  PAYME_MIN_SUB_PRICE_AGOROT,
  agorotFromIls,
  computeProviderEventId,
  computeSubscriptionStartDate,
  constantTimeEquals,
  formatPayMeDate,
  parsePayMeCallbackBody,
  paymeIterationType,
  redactSecrets,
  safeCallbackSummary,
} from "./payme-helpers";
import { decideSubscriptionTransition, type LocalSubscriptionForTransition, type PayMeCallbackEvent } from "./decide-subscription-transition";

const NOW = new Date("2026-10-08T10:00:00.000Z");

describe("amounts and iteration types", () => {
  it("converts the launch prices to agorot and stays above PayMe's minimum", () => {
    expect(agorotFromIls(39)).toBe(3900);
    expect(agorotFromIls(390)).toBe(39000);
    expect(agorotFromIls(49)).toBe(4900);
    expect(agorotFromIls(490)).toBe(49000);
    expect(agorotFromIls(39)).toBeGreaterThanOrEqual(PAYME_MIN_SUB_PRICE_AGOROT);
    expect(agorotFromIls(50.75)).toBe(5075);
  });

  it("maps billing intervals to PayMe iteration types (3 monthly, 4 yearly)", () => {
    expect(paymeIterationType("monthly")).toBe(3);
    expect(paymeIterationType("yearly")).toBe(4);
  });
});

describe("first charge date = trial end", () => {
  it("yearly: exactly when the trial ends", () => {
    const end = new Date("2026-12-31T08:00:00.000Z");
    expect(computeSubscriptionStartDate(end, "yearly").toISOString()).toBe(end.toISOString());
  });

  it("monthly: exactly when the trial ends when the day is 1–28 (Israel time)", () => {
    const end = new Date("2026-11-17T08:00:00.000Z");
    expect(computeSubscriptionStartDate(end, "monthly").toISOString()).toBe(end.toISOString());
  });

  it("monthly: a trial ending on the 29th–31st starts billing on the 1st of next month — never earlier than the trial end", () => {
    for (const iso of ["2026-10-29T08:00:00.000Z", "2026-10-31T08:00:00.000Z", "2026-12-30T08:00:00.000Z"]) {
      const end = new Date(iso);
      const start = computeSubscriptionStartDate(end, "monthly");
      expect(start.getTime()).toBeGreaterThan(end.getTime());
      expect(start.getUTCDate()).toBe(1);
    }
    expect(computeSubscriptionStartDate(new Date("2026-12-30T08:00:00.000Z"), "monthly").toISOString()).toBe("2027-01-01T00:05:00.000Z");
  });

  it("formats dates the way PayMe's examples do (dd/mm/yyyy hh:mm, Israel time)", () => {
    expect(formatPayMeDate(new Date("2026-10-08T10:15:00.000Z"))).toBe("08/10/2026 13:15");
  });
});

describe("callback parsing", () => {
  const body = "notify_type=sub-failure&sub_payme_id=SUB123-ABC&sub_status=7&subscription_id=reg-1&sub_iterations_completed=2&buyer_key=SECRET-TOKEN&sub_error_text=Failed";

  it("parses the form-encoded body", () => {
    const parsed = parsePayMeCallbackBody(body);
    expect(parsed.notifyType).toBe("sub-failure");
    expect(parsed.subPaymeId).toBe("SUB123-ABC");
    expect(parsed.merchantSubscriptionId).toBe("reg-1");
  });

  it("the same callback always yields the same event id; a different one does not", () => {
    const a = computeProviderEventId(parsePayMeCallbackBody(body).fields);
    const reordered = computeProviderEventId(parsePayMeCallbackBody("sub_payme_id=SUB123-ABC&notify_type=sub-failure&sub_status=7&subscription_id=reg-1&sub_iterations_completed=2&buyer_key=SECRET-TOKEN&sub_error_text=Failed").fields);
    const other = computeProviderEventId(parsePayMeCallbackBody(body.replace("completed=2", "completed=3")).fields);
    expect(a).toBe(reordered);
    expect(a).not.toBe(other);
  });

  it("only whitelisted fields are ever stored — never a token or anything unknown", () => {
    const summary = safeCallbackSummary(parsePayMeCallbackBody(body).fields);
    expect(Object.keys(summary).sort()).toEqual(["notify_type", "sub_iterations_completed", "sub_payme_id", "sub_status", "subscription_id"]);
    expect(JSON.stringify(summary)).not.toContain("SECRET-TOKEN");
  });
});

describe("secrets", () => {
  it("compares the webhook secret in constant time and rejects wrong / different-length values", () => {
    expect(constantTimeEquals("abcdef123456", "abcdef123456")).toBe(true);
    expect(constantTimeEquals("abcdef123456", "abcdef123457")).toBe(false);
    expect(constantTimeEquals("abc", "abcdef")).toBe(false);
  });

  it("redacts secrets from text before it can reach a log", () => {
    expect(redactSecrets("failed with key MPL-SECRET-123456 and token TOKEN-ABCDEF", ["MPL-SECRET-123456", "TOKEN-ABCDEF"])).toBe("failed with key [redacted] and token [redacted]");
  });
});

function local(overrides: Partial<LocalSubscriptionForTransition> = {}): LocalSubscriptionForTransition {
  return {
    status: "trialing",
    billingInterval: "monthly",
    priceAmountIls: 39,
    trialEndsAt: "2026-10-08T09:00:00.000Z",
    paymentFailedAt: null,
    gracePeriodEndsAt: null,
    lastPaymentSucceededAt: null,
    currentPeriodEndsAt: null,
    ...overrides,
  };
}

const ctx = { now: NOW, subPaymeId: "SUB1", callbackTransactionId: null, eventKey: "abcdef0123456789abcdef" };
const event = (notifyType: string, extra: Partial<PayMeCallbackEvent> = {}): PayMeCallbackEvent => ({ notifyType, errorText: null, iterationsCompleted: null, ...extra });

describe("decideSubscriptionTransition (driven by the documented notify_type only)", () => {
  it("first successful charge after the trial: trialing → active, clears failure state, books OUR snapshot price as revenue", () => {
    const decision = decideSubscriptionTransition(local(), event("sub-active"), ctx);
    expect(decision.kind).toBe("payment-succeeded");
    if (decision.kind !== "payment-succeeded") return;
    expect(decision.patch.status).toBe("active");
    expect(decision.patch.payment_failed_at).toBeNull();
    expect(decision.transaction).toMatchObject({ kind: "charge", status: "succeeded", amountAgorot: 3900 });
    expect(decision.businessEvent).toBe("subscription_activated");
    expect(decision.activatePlan).toBe(true);
    expect(decision.patch.current_period_ends_at).toBe("2026-11-08T10:00:00.000Z");
  });

  it("the amount comes from the stored snapshot — never from the callback", () => {
    const decision = decideSubscriptionTransition(local({ priceAmountIls: 490, billingInterval: "yearly" }), { ...event("sub-active"), sub_price: "1", price: "1" } as unknown as PayMeCallbackEvent, ctx);
    if (decision.kind !== "payment-succeeded") throw new Error("expected success");
    expect(decision.transaction?.amountAgorot).toBe(49000);
  });

  it("a later successful charge is a renewal; yearly periods run a year", () => {
    const decision = decideSubscriptionTransition(local({ status: "active", billingInterval: "yearly", priceAmountIls: 390, lastPaymentSucceededAt: "2025-10-08T10:00:00.000Z" }), event("sub-iteration-success"), ctx);
    if (decision.kind !== "payment-succeeded") throw new Error("expected success");
    expect(decision.transaction?.kind).toBe("renewal");
    expect(decision.businessEvent).toBeNull();
    expect(decision.patch.current_period_ends_at).toBe("2027-10-08T10:00:00.000Z");
  });

  it("transaction id: the callback's own id wins, then the iteration counter, then a per-day key", () => {
    const withId = decideSubscriptionTransition(local(), event("sub-active"), { ...ctx, callbackTransactionId: "SALE-123" });
    const withIteration = decideSubscriptionTransition(local(), event("sub-active", { iterationsCompleted: 1 }), ctx);
    const fallback = decideSubscriptionTransition(local(), event("sub-active"), ctx);
    expect(withId.kind === "payment-succeeded" && withId.transaction?.providerTransactionId).toBe("SALE-123");
    expect(withIteration.kind === "payment-succeeded" && withIteration.transaction?.providerTransactionId).toBe("SUB1:iter:1");
    expect(fallback.kind === "payment-succeeded" && fallback.transaction?.providerTransactionId).toBe("SUB1:paid:2026-10-08");
  });

  it("sub-active AND sub-iteration-success for ONE charge count once: the second is a duplicate notification", () => {
    const first = decideSubscriptionTransition(local(), event("sub-active"), ctx);
    expect(first.kind).toBe("payment-succeeded");
    // the same charge announced again an hour later, after the first one was applied
    const second = decideSubscriptionTransition(local({ status: "active", lastPaymentSucceededAt: NOW.toISOString() }), event("sub-iteration-success"), { ...ctx, now: new Date(NOW.getTime() + 60 * 60 * 1000) });
    expect(second).toEqual({ kind: "no-change", reason: "duplicate-payment-notification" });
  });

  it("a payment reported long before the trial ends, or after the subscription ended, is NOT booked — it needs attention", () => {
    expect(decideSubscriptionTransition(local({ trialEndsAt: "2026-10-20T10:00:00.000Z" }), event("sub-active"), ctx)).toEqual({ kind: "needs-attention", reason: "payment-reported-during-trial" });
    expect(decideSubscriptionTransition(local({ status: "canceled" }), event("sub-active"), ctx)).toEqual({ kind: "needs-attention", reason: "payment-after-subscription-ended" });
    expect(decideSubscriptionTransition(local({ status: "expired" }), event("sub-iteration-success"), ctx)).toEqual({ kind: "needs-attention", reason: "payment-after-subscription-ended" });
  });

  it("a payment with no stored price snapshot cannot be booked safely", () => {
    expect(decideSubscriptionTransition(local({ priceAmountIls: null }), event("sub-active"), ctx)).toEqual({ kind: "needs-attention", reason: "no-price-snapshot" });
  });

  it("a payment up to a day before the stored trial end is accepted (rounding), a day or more earlier is not", () => {
    const nearly = decideSubscriptionTransition(local({ trialEndsAt: "2026-10-09T09:00:00.000Z" }), event("sub-active"), ctx);
    expect(nearly.kind).toBe("payment-succeeded");
    const tooEarly = decideSubscriptionTransition(local({ trialEndsAt: "2026-10-09T11:00:00.000Z" }), event("sub-active"), ctx);
    expect(tooEarly.kind).toBe("needs-attention");
  });

  it("a failed charge opens a 7-day grace period (page stays live) and records a failed transaction — never revenue", () => {
    const decision = decideSubscriptionTransition(local({ status: "active", lastPaymentSucceededAt: "2026-09-08T10:00:00.000Z" }), event("sub-failure", { errorText: "Failed, pending automatic retry" }), ctx);
    if (decision.kind !== "payment-failed") throw new Error("expected failure");
    expect(decision.patch.status).toBe("grace-period");
    expect(decision.patch.payment_failed_at).toBe(NOW.toISOString());
    expect(decision.patch.grace_period_ends_at).toBe("2026-10-15T10:00:00.000Z");
    expect(decision.transaction).toMatchObject({ kind: "failed", status: "failed", amountAgorot: 3900 });
    expect(decision.businessEvent).toBe("payment_failed");
    expect(decision.activatePlan).toBe(false);
  });

  it("a second failure inside the grace period does NOT restart or extend it", () => {
    const decision = decideSubscriptionTransition(local({ status: "grace-period", paymentFailedAt: "2026-10-05T10:00:00.000Z", gracePeriodEndsAt: "2026-10-12T10:00:00.000Z" }), event("sub-failure", { errorText: "Declined" }), ctx);
    if (decision.kind !== "payment-failed") throw new Error("expected failure");
    expect(decision.patch.status).toBeUndefined();
    expect(decision.patch.grace_period_ends_at).toBeUndefined();
    expect(decision.patch.payment_failed_at).toBeUndefined();
    expect(decision.businessEvent).toBeNull();
  });

  it("a successful charge during grace recovers the subscription and clears the grace period", () => {
    const decision = decideSubscriptionTransition(
      local({ status: "grace-period", paymentFailedAt: "2026-10-05T10:00:00.000Z", gracePeriodEndsAt: "2026-10-12T10:00:00.000Z", lastPaymentSucceededAt: "2026-09-05T10:00:00.000Z" }),
      event("sub-iteration-success"),
      ctx,
    );
    if (decision.kind !== "payment-succeeded") throw new Error("expected success");
    expect(decision.patch.status).toBe("active");
    expect(decision.patch.grace_period_ends_at).toBeNull();
    expect(decision.businessEvent).toBe("payment_recovered");
  });

  it("cancel during the trial keeps access until the trial end; after payment, until the paid period end", () => {
    const duringTrial = decideSubscriptionTransition(local({ status: "trialing" }), event("sub-cancel"), ctx);
    if (duringTrial.kind !== "canceled") throw new Error("expected cancel");
    expect(duringTrial.patch.current_period_ends_at).toBe("2026-10-08T09:00:00.000Z");
    expect(duringTrial.patch.cancel_at_period_end).toBe(true);

    const afterPayment = decideSubscriptionTransition(local({ status: "active", lastPaymentSucceededAt: "2026-10-01T10:00:00.000Z" }), event("sub-cancel"), ctx);
    if (afterPayment.kind !== "canceled") throw new Error("expected cancel");
    expect(afterPayment.patch.current_period_ends_at).toBe("2026-11-01T10:00:00.000Z");
  });

  it("informational / unknown notifications change nothing; ended subscriptions ignore failures and cancels", () => {
    expect(decideSubscriptionTransition(local(), event("sub-create"), ctx).kind).toBe("no-change");
    expect(decideSubscriptionTransition(local(), event("sub-complete"), ctx).kind).toBe("no-change");
    expect(decideSubscriptionTransition(local(), event("something-new"), ctx)).toEqual({ kind: "no-change", reason: "unknown-notify-type" });
    expect(decideSubscriptionTransition(local({ status: "canceled" }), event("sub-failure"), ctx).kind).toBe("no-change");
    expect(decideSubscriptionTransition(local({ status: "canceled" }), event("sub-cancel"), ctx).kind).toBe("no-change");
  });
});
