import { describe, expect, it } from "vitest";
import {
  computeAttention,
  computeCollectedAgorot,
  computeKpis,
  computeMrrIls,
  computePilotSummary,
  computeRevenueBreakdown,
  computeRevenueSeries,
  computeSummaryMetrics,
  computeTrialSplit,
  filterSubscriptions,
  resolvePeriod,
  type RevenueSubscription,
  type RevenueTransaction,
} from "./revenue-metrics";
import { subscriptionsToCsv, toCsv, transactionsToCsv } from "./revenue-csv";

const NOW = new Date("2026-10-15T09:00:00.000Z");
const PERIOD = resolvePeriod("month", NOW);

function sub(overrides: Partial<RevenueSubscription> = {}): RevenueSubscription {
  return {
    id: "s1",
    businessId: "b1",
    businessName: "סטודיו מיכל",
    ownerName: "מיכל",
    planId: "plus",
    interval: "monthly",
    priceIls: 39,
    isLaunchPrice: true,
    offerCode: "launch_standard",
    trialDays: 30,
    status: "active",
    trialStartedAt: "2026-09-01T00:00:00.000Z",
    trialEndsAt: "2026-10-01T00:00:00.000Z",
    nextBillingAt: null,
    paymentProvider: "payme",
    providerSubscriptionId: "SUB1",
    hasPaymentMethod: true,
    lastPaymentSucceededAt: null,
    lastPaymentFailedAt: null,
    paymentFailedAt: null,
    gracePeriodEndsAt: null,
    canceledAt: null,
    paymentFailureReason: null,
    ...overrides,
  };
}

function tx(overrides: Partial<RevenueTransaction> = {}): RevenueTransaction {
  return {
    id: "t1",
    providerTransactionId: "P1",
    businessId: "b1",
    businessName: "סטודיו מיכל",
    planId: "plus",
    interval: "monthly",
    offerCode: "launch_standard",
    kind: "charge",
    status: "succeeded",
    amountAgorot: 3900,
    occurredAt: "2026-10-05T10:00:00.000Z",
    failureReason: null,
    ...overrides,
  };
}

describe("periods", () => {
  it("resolves Israel calendar periods", () => {
    expect(resolvePeriod("month", NOW).from.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    const last = resolvePeriod("last-month", NOW);
    expect(last.from.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(last.to.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    const week = resolvePeriod("7d", NOW);
    expect(Math.round((week.to.getTime() - week.from.getTime()) / 86400000)).toBe(7);
  });

  it("custom ranges include the whole last day and fall back safely on bad input", () => {
    const custom = resolvePeriod("custom", NOW, "2026-10-01", "2026-10-03");
    expect(Math.round((custom.to.getTime() - custom.from.getTime()) / 86400000)).toBe(3);
    expect(resolvePeriod("custom", NOW, "garbage", null).preset).toBe("30d");
  });
});

describe("collected revenue vs forecast", () => {
  it("counts only PayMe-confirmed successful charges inside the period — never failed, pending or refunded", () => {
    const transactions = [
      tx({ id: "a", amountAgorot: 3900 }),
      tx({ id: "b", kind: "renewal", amountAgorot: 4900, occurredAt: "2026-10-10T10:00:00.000Z" }),
      tx({ id: "c", status: "failed", kind: "failed", amountAgorot: 3900 }),
      tx({ id: "d", status: "pending", amountAgorot: 3900 }),
      tx({ id: "e", status: "refunded", kind: "refund", amountAgorot: 3900 }),
      tx({ id: "f", occurredAt: "2026-08-05T10:00:00.000Z", amountAgorot: 9999 }),
    ];
    expect(computeCollectedAgorot(transactions, PERIOD)).toEqual({ amount: 8800, count: 2 });
  });

  it("MRR counts only ACTIVE subscriptions; yearly is divided by 12 for MRR only", () => {
    const subs = [
      sub({ id: "1", status: "active", interval: "monthly", priceIls: 39 }),
      sub({ id: "2", status: "active", interval: "yearly", priceIls: 390 }),
      sub({ id: "3", status: "trialing", interval: "monthly", priceIls: 49 }),
      sub({ id: "4", status: "grace-period", interval: "monthly", priceIls: 49 }),
    ];
    expect(computeMrrIls(subs)).toBe(71.5);
    const kpis = computeKpis({ subscriptions: subs, transactions: [], attentionCount: 0, period: PERIOD });
    expect(kpis.mrrIls).toBe(71.5);
    expect(kpis.arrIls).toBe(858);
    expect(kpis.collectedAgorot).toBe(0);
  });

  it("MRR/ARR are null (not 0) when there is nothing reliable to compute them from", () => {
    expect(computeMrrIls([sub({ status: "trialing" })])).toBeNull();
    expect(computeMrrIls([sub({ status: "active", priceIls: null })])).toBeNull();
  });

  it("splits trials into standard (30) and pilot (90) from the snapshot, treating legacy rows as standard", () => {
    const subs = [
      sub({ id: "1", status: "trialing", offerCode: "launch_standard" }),
      sub({ id: "2", status: "trialing", offerCode: null, trialDays: null }),
      sub({ id: "3", status: "trialing", offerCode: "pilot_2026", trialDays: 90 }),
      sub({ id: "4", status: "active", offerCode: "pilot_2026", trialDays: 90 }),
    ];
    expect(computeTrialSplit(subs)).toEqual({ standard: 2, pilot: 1, total: 3 });
  });
});

describe("series and breakdown", () => {
  it("buckets only collected revenue, zero-filled, and breaks it down by plan and interval", () => {
    const transactions = [
      tx({ id: "a", occurredAt: "2026-10-02T10:00:00.000Z", amountAgorot: 3900, planId: "plus", interval: "monthly" }),
      tx({ id: "b", occurredAt: "2026-10-02T12:00:00.000Z", amountAgorot: 49000, planId: "premium", interval: "yearly" }),
      tx({ id: "c", status: "failed", kind: "failed", occurredAt: "2026-10-03T10:00:00.000Z", amountAgorot: 3900 }),
    ];
    const series = computeRevenueSeries(transactions, PERIOD, "day");
    expect(series.length).toBeGreaterThanOrEqual(15);
    expect(series.find((b) => b.key === "2026-10-02")?.amountAgorot).toBe(52900);
    expect(series.find((b) => b.key === "2026-10-03")?.amountAgorot).toBe(0);
    expect(computeRevenueBreakdown(transactions, PERIOD, "plan").map((r) => [r.key, r.amountAgorot])).toEqual([
      ["premium", 49000],
      ["plus", 3900],
    ]);
    expect(computeRevenueBreakdown(transactions, PERIOD, "interval").map((r) => r.key)).toEqual(["yearly", "monthly"]);
  });
});

describe("needs attention", () => {
  it("flags failed charges with the grace days left, escalates under 2 days, and flags ended grace periods", () => {
    const subs = [
      sub({ id: "1", businessId: "b1", businessName: "סטודיו מיכל", status: "grace-period", gracePeriodEndsAt: "2026-10-20T09:00:00.000Z", paymentFailedAt: "2026-10-13T09:00:00.000Z", paymentFailureReason: "Declined" }),
      sub({ id: "2", businessId: "b2", businessName: "קפה", status: "grace-period", gracePeriodEndsAt: "2026-10-16T09:00:00.000Z" }),
      sub({ id: "3", businessId: "b3", businessName: "מספרה", status: "past-due" }),
      sub({ id: "4", businessId: "b4", businessName: "פיצה", status: "active" }),
    ];
    const items = computeAttention({ subscriptions: subs, billingEvents: [], now: NOW });
    expect(items.map((i) => [i.businessName, i.kind, i.graceDaysLeft])).toEqual([
      ["קפה", "grace-ending", 1],
      ["מספרה", "past-due", 0],
      ["סטודיו מיכל", "payment-failed", 5],
    ]);
    expect(items.find((i) => i.businessName === "סטודיו מיכל")?.message).toBe('התשלום של "סטודיו מיכל" נכשל');
  });

  it("flags failed / stuck webhook events and PayMe trials that never got a charge confirmation", () => {
    const items = computeAttention({
      subscriptions: [sub({ id: "5", businessId: "b5", businessName: "ספרים", status: "trialing", trialEndsAt: "2026-10-10T00:00:00.000Z" })],
      billingEvents: [
        { id: "e1", eventType: "sub-failure", providerEventId: "x", status: "failed", error: "unknown-subscription", receivedAt: "2026-10-14T00:00:00.000Z", businessId: null, providerSubscriptionId: "Z" },
        { id: "e2", eventType: "sub-active", providerEventId: "y", status: "processed", error: null, receivedAt: "2026-10-14T00:00:00.000Z", businessId: null, providerSubscriptionId: "Z" },
        { id: "e3", eventType: "sub-active", providerEventId: "w", status: "received", error: null, receivedAt: "2026-10-15T08:00:00.000Z", businessId: null, providerSubscriptionId: "Z" },
      ],
      now: NOW,
    });
    expect(items.map((i) => i.kind).sort()).toEqual(["not-syncing", "webhook-failed", "webhook-failed"]);
  });
});

describe("summary metrics never invent numbers", () => {
  it("returns a null conversion rate when no trial ended in the period", () => {
    const summary = computeSummaryMetrics({ subscriptions: [], transactions: [], businessEvents: [], period: PERIOD });
    expect(summary.conversion.all.rate).toBeNull();
    expect(summary.conversion.pilot.rate).toBeNull();
    expect(summary.newPayingSubscriptions).toBe(0);
  });

  it("keeps pilot and standard conversion separate", () => {
    const subs = [
      sub({ id: "1", businessId: "b1", offerCode: "launch_standard", trialEndsAt: "2026-10-05T00:00:00.000Z" }),
      sub({ id: "2", businessId: "b2", offerCode: "launch_standard", trialEndsAt: "2026-10-06T00:00:00.000Z" }),
      sub({ id: "3", businessId: "b3", offerCode: "pilot_2026", trialDays: 90, trialEndsAt: "2026-10-07T00:00:00.000Z" }),
    ];
    const transactions = [tx({ id: "t1", businessId: "b1" }), tx({ id: "t3", businessId: "b3", amountAgorot: 4900 })];
    const summary = computeSummaryMetrics({ subscriptions: subs, transactions, businessEvents: [{ businessId: "b1", eventType: "payment_recovered", createdAt: "2026-10-09T00:00:00.000Z" }], period: PERIOD });
    expect(summary.conversion.standard).toEqual({ endedInPeriod: 2, converted: 1, rate: 50 });
    expect(summary.conversion.pilot).toEqual({ endedInPeriod: 1, converted: 1, rate: 100 });
    expect(summary.recoveredPayments).toBe(1);
    expect(summary.newPayingSubscriptions).toBe(2);
  });

  it("summarises the pilot group separately", () => {
    const subs = [
      sub({ id: "1", businessId: "p1", offerCode: "pilot_2026", status: "trialing", trialEndsAt: "2026-11-15T09:00:00.000Z" }),
      sub({ id: "2", businessId: "p2", offerCode: "pilot_2026", status: "active" }),
      sub({ id: "3", businessId: "p3", offerCode: "pilot_2026", status: "grace-period" }),
      sub({ id: "4", businessId: "s1", offerCode: "launch_standard", status: "active" }),
    ];
    const transactions = [tx({ businessId: "p2" }), tx({ id: "f", businessId: "p3", status: "failed", kind: "failed" })];
    const pilot = computePilotSummary(subs, transactions, 10, NOW);
    expect(pilot).toMatchObject({ pilotBusinesses: 10, trialStarted: 3, trialing: 1, convertedToPaid: 1, failedFirstCharge: 1 });
    expect(pilot.remaining).toEqual([{ businessId: "p1", businessName: "סטודיו מיכל", daysLeft: 31 }]);
  });
});

describe("filters and CSV", () => {
  it("filters subscriptions by plan, offer, interval and status", () => {
    const subs = [
      sub({ id: "1", planId: "plus", offerCode: "pilot_2026", interval: "yearly", status: "trialing" }),
      sub({ id: "2", planId: "premium", offerCode: "launch_standard", interval: "monthly", status: "active" }),
    ];
    expect(filterSubscriptions(subs, { offer: "pilot" }).map((s) => s.id)).toEqual(["1"]);
    expect(filterSubscriptions(subs, { plan: "premium", status: "active" }).map((s) => s.id)).toEqual(["2"]);
    expect(filterSubscriptions(subs, { interval: "yearly", status: "active" })).toEqual([]);
  });

  it("exports CSV with escaping, a BOM, formula-injection protection and no token-like columns", () => {
    const csv = transactionsToCsv([tx({ businessName: '=HYPERLINK("x")', failureReason: 'a,"b"' })]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"a,""b"""');
    const subsCsv = subscriptionsToCsv([sub()]);
    expect(subsCsv).not.toMatch(/token|buyer_key|provider_token/i);
    expect(toCsv(["a"], [["x"]])).toBe("﻿a\r\nx\r\n");
  });
});
