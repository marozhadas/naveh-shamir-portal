import { describe, expect, it } from "vitest";
import { getSubscriptionSummary, BILLING_PROVIDER_CONNECTED } from "./get-subscription-summary";
import { getSubscriptionAccess } from "./get-subscription-access";
import type { Business } from "@/types/business";
import type { BusinessSubscription } from "@/types/subscription";
import type { BusinessSelfEditAccess } from "./get-business-self-edit-access";

const NOW = new Date("2026-09-20T12:00:00.000Z");

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "reg-1",
    slug: "mika-pilates",
    name: "עסק",
    category: "other",
    description: "",
    imageUrl: "",
    imageAlt: "",
    status: "published",
    selectedPlanId: "plus",
    activePlanId: "basic",
    selectedBillingInterval: "monthly",
    ...overrides,
  } as Business;
}

function makeSub(overrides: Partial<BusinessSubscription> = {}): BusinessSubscription {
  return {
    id: "s1",
    businessId: "reg-1",
    ownerId: "o1",
    planId: "plus",
    status: "trialing",
    trialStartedAt: "2026-09-10T00:00:00.000Z",
    trialEndsAt: "2026-10-10T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    billingInterval: "monthly",
    priceAmountIls: 39,
    priceVersion: "launch-2026",
    isLaunchPrice: true,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

const ELIGIBLE: BusinessSelfEditAccess = { eligible: true };

function summarize(business: Business, subscription: BusinessSubscription | null, selfEdit: BusinessSelfEditAccess | null = ELIGIBLE) {
  const access = subscription ? getSubscriptionAccess(subscription, NOW) : null;
  return getSubscriptionSummary({ business, subscription, access, selfEditAccess: selfEdit, now: NOW });
}

describe("getSubscriptionSummary — stages", () => {
  it("Basic: free, no price, no self-edit", () => {
    const s = summarize(makeBusiness({ selectedPlanId: "basic", activePlanId: "basic" }), null);
    expect(s.stage).toBe("basic");
    expect(s.price).toBeNull();
    expect(s.editLimit.label).toBe("ללא עריכה עצמאית");
    expect(s.canStartTrial).toBe(false);
  });

  it("Pending: a paid plan chosen but the business is not approved yet — trial not startable, not started", () => {
    const s = summarize(makeBusiness({ status: "pending-review" }), null);
    expect(s.stage).toBe("awaiting-approval");
    expect(s.canStartTrial).toBe(false);
    expect(s.trial).toBeNull();
  });

  it("Approved but no valid English slug: trial blocked", () => {
    const s = summarize(makeBusiness({ slug: "עסק-חדש" }), null);
    expect(s.stage).toBe("slug-required");
    expect(s.canStartTrial).toBe(false);
  });

  it("Approved with a valid slug and no subscription: trial can be started, and it has not started", () => {
    const s = summarize(makeBusiness(), null);
    expect(s.stage).toBe("awaiting-trial-start");
    expect(s.canStartTrial).toBe(true);
    expect(s.trial).toBeNull();
  });

  it("Trialing: shows trial dates and the assigned launch price", () => {
    const s = summarize(makeBusiness({ activePlanId: "plus" }), makeSub());
    expect(s.stage).toBe("trialing");
    expect(s.trial).toEqual({ startedAt: "2026-09-10T00:00:00.000Z", endsAt: "2026-10-10T00:00:00.000Z" });
    expect(s.price).toEqual({ amountIls: 39, interval: "monthly", isLaunchPrice: true, source: "assigned" });
    expect(s.canStartTrial).toBe(false);
  });

  it("a trial that already started can never be started again", () => {
    const expired = summarize(makeBusiness({ activePlanId: "basic" }), makeSub({ status: "expired" }));
    expect(expired.stage).toBe("expired");
    expect(expired.canStartTrial).toBe(false);
  });

  it("Trialing whose end date has passed is reported as expired", () => {
    const s = summarize(makeBusiness(), makeSub({ trialEndsAt: "2026-09-01T00:00:00.000Z" }));
    expect(s.stage).toBe("expired");
  });

  it.each([
    ["canceled", "canceled"],
    ["paused", "paused"],
    ["past-due", "past-due"],
  ] as const)("inactive subscription status %s maps to stage %s", (status, stage) => {
    expect(summarize(makeBusiness(), makeSub({ status })).stage).toBe(stage);
  });

  it("grace period is only reported while its end date is in the future", () => {
    const live = summarize(makeBusiness(), makeSub({ status: "grace-period", gracePeriodEndsAt: "2026-09-25T00:00:00.000Z" }));
    expect(live.stage).toBe("grace-period");
    expect(live.gracePeriodEndsAt).toBe("2026-09-25T00:00:00.000Z");
    const over = summarize(makeBusiness(), makeSub({ status: "grace-period", gracePeriodEndsAt: "2026-09-19T00:00:00.000Z" }));
    expect(over.stage).toBe("expired");
  });

  it("admin-granted plan without a subscription is labelled as such", () => {
    expect(summarize(makeBusiness({ activePlanId: "premium", selectedPlanId: "premium" }), null).stage).toBe("admin-granted");
  });
});

describe("getSubscriptionSummary — pricing", () => {
  it("shows the yearly launch price for a yearly Premium subscription", () => {
    const s = summarize(
      makeBusiness({ selectedPlanId: "premium", activePlanId: "premium", selectedBillingInterval: "yearly" }),
      makeSub({ planId: "premium", billingInterval: "yearly", priceAmountIls: 490 }),
    );
    expect(s.price).toEqual({ amountIls: 490, interval: "yearly", isLaunchPrice: true, source: "assigned" });
    expect(s.planName).toBe("Premium");
  });

  it("keeps the assigned price even when today's price list differs", () => {
    const s = summarize(makeBusiness({ activePlanId: "plus" }), makeSub({ priceAmountIls: 29, isLaunchPrice: false }));
    expect(s.price).toEqual({ amountIls: 29, interval: "monthly", isLaunchPrice: false, source: "assigned" });
  });

  it("never labels a price as launch when the stored snapshot does not say so", () => {
    const s = summarize(makeBusiness({ activePlanId: "plus" }), makeSub({ isLaunchPrice: undefined }));
    expect(s.price?.isLaunchPrice).toBe(false);
  });

  it("before any subscription exists, the price is clearly today's offer, not an assigned price", () => {
    const s = summarize(makeBusiness({ selectedBillingInterval: "yearly" }), null);
    expect(s.price).toEqual({ amountIls: 390, interval: "yearly", isLaunchPrice: true, source: "current-offer" });
  });

  it("a legacy subscription with no stored price falls back to a labelled current-offer, not an assigned one", () => {
    const s = summarize(makeBusiness({ activePlanId: "plus" }), makeSub({ billingInterval: undefined, priceAmountIls: undefined, isLaunchPrice: undefined }));
    expect(s.price?.source).toBe("current-offer");
  });
});

describe("getSubscriptionSummary — billing honesty and edit limits", () => {
  it("no billing provider is connected, so no billing date is ever produced", () => {
    expect(BILLING_PROVIDER_CONNECTED).toBe(false);
    const s = summarize(makeBusiness({ activePlanId: "plus" }), makeSub({ status: "active", currentPeriodEndsAt: "2026-10-20T00:00:00.000Z" }));
    expect(s.nextBillingDate).toBeNull();
  });

  it("Plus: one edit per calendar month, and reports when the month's edit was used", () => {
    const available = summarize(makeBusiness({ activePlanId: "plus" }), makeSub(), ELIGIBLE);
    expect(available.editLimit.label).toBe("עריכה אחת בחודש קלנדרי");
    expect(available.editLimit.detail).toContain("עדיין זמינה");
    const used = summarize(makeBusiness({ activePlanId: "plus" }), makeSub(), { eligible: false, reason: "already-edited-this-month" });
    expect(used.editLimit.detail).toContain("כבר נוצלה");
  });

  it("Premium: unlimited edits", () => {
    const s = summarize(makeBusiness({ selectedPlanId: "premium", activePlanId: "premium" }), makeSub({ planId: "premium" }));
    expect(s.editLimit.label).toBe("עריכה עצמאית ללא הגבלה");
  });
});
