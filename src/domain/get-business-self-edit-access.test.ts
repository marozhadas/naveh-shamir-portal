import { describe, expect, it } from "vitest";
import { getBusinessSelfEditAccess } from "./get-business-self-edit-access";
import type { SubscriptionAccess } from "@/types/subscription";

const EDITABLE_ACCESS: SubscriptionAccess = {
  canEdit: true,
  canPreview: true,
  canPublish: true,
  canAppearInArchive: true,
  canManageSubscription: true,
  daysRemainingInTrial: null,
  reason: "subscription-active",
};

const NOT_EDITABLE_ACCESS: SubscriptionAccess = { ...EDITABLE_ACCESS, canEdit: false, reason: "trial-expired" };

describe("getBusinessSelfEditAccess — Basic", () => {
  it("is never eligible, even with a fully active subscription and no prior edit", () => {
    expect(
      getBusinessSelfEditAccess({ activePlanId: "basic", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt: null, now: new Date("2026-06-15T10:00:00Z") }),
    ).toEqual({ eligible: false, reason: "plan-not-eligible" });
  });

  it("is never eligible even with no subscription record at all", () => {
    expect(
      getBusinessSelfEditAccess({ activePlanId: "basic", subscriptionAccess: null, lastSelfEditAt: null, now: new Date("2026-06-15T10:00:00Z") }),
    ).toEqual({ eligible: false, reason: "plan-not-eligible" });
  });
});

describe("getBusinessSelfEditAccess — Plus", () => {
  const now = new Date("2026-06-15T10:00:00Z");

  it("is ineligible with no subscription record", () => {
    expect(getBusinessSelfEditAccess({ activePlanId: "plus", subscriptionAccess: null, lastSelfEditAt: null, now })).toEqual({
      eligible: false,
      reason: "no-subscription",
    });
  });

  it("is ineligible when the subscription itself doesn't permit editing (e.g. trial expired)", () => {
    expect(getBusinessSelfEditAccess({ activePlanId: "plus", subscriptionAccess: NOT_EDITABLE_ACCESS, lastSelfEditAt: null, now })).toEqual({
      eligible: false,
      reason: "subscription-not-editable",
    });
  });

  it("is eligible on a first-ever edit (lastSelfEditAt null)", () => {
    expect(getBusinessSelfEditAccess({ activePlanId: "plus", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt: null, now })).toEqual({ eligible: true });
  });

  it("is ineligible when already edited earlier the same Jerusalem calendar month", () => {
    const result = getBusinessSelfEditAccess({
      activePlanId: "plus",
      subscriptionAccess: EDITABLE_ACCESS,
      lastSelfEditAt: "2026-06-01T05:00:00Z",
      now,
    });
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reason).toBe("already-edited-this-month");
      expect(result.nextEligibleAt).toBe(new Date(Date.UTC(2026, 6, 1, 0, 0, 0)).toISOString());
    }
  });

  it("is eligible again once the calendar month has rolled over", () => {
    expect(
      getBusinessSelfEditAccess({ activePlanId: "plus", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt: "2026-05-31T10:00:00Z", now }),
    ).toEqual({ eligible: true });
  });

  it("treats a same-instant edit as already used this month", () => {
    const sameInstant = new Date("2026-06-15T10:00:00Z");
    expect(
      getBusinessSelfEditAccess({ activePlanId: "plus", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt: sameInstant.toISOString(), now: sameInstant }),
    ).toMatchObject({ eligible: false, reason: "already-edited-this-month" });
  });

  it("handles a year boundary correctly (edited in December, now is January)", () => {
    expect(
      getBusinessSelfEditAccess({
        activePlanId: "plus",
        subscriptionAccess: EDITABLE_ACCESS,
        lastSelfEditAt: "2026-12-20T10:00:00Z",
        now: new Date("2027-01-03T10:00:00Z"),
      }),
    ).toEqual({ eligible: true });
  });

  it("is DST-safe around the Jerusalem clock change: a UTC timestamp just before local midnight on the 1st still counts as the new month", () => {
    // Israel is UTC+3 (DST) in early September — 2026-08-31T21:30:00Z is 2026-09-01T00:30 in Jerusalem.
    const lastSelfEditAt = "2026-08-31T21:30:00Z";
    const now = new Date("2026-09-15T10:00:00Z");
    // Same Jerusalem month (September) as `now` → already used.
    expect(getBusinessSelfEditAccess({ activePlanId: "plus", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt, now })).toMatchObject({
      eligible: false,
      reason: "already-edited-this-month",
    });
  });

  it("a UTC timestamp just before that DST threshold is still August, so a September edit is eligible", () => {
    const lastSelfEditAt = "2026-08-31T20:30:00Z"; // 2026-08-31T23:30 in Jerusalem — still August.
    const now = new Date("2026-09-15T10:00:00Z");
    expect(getBusinessSelfEditAccess({ activePlanId: "plus", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt, now })).toEqual({ eligible: true });
  });
});

describe("getBusinessSelfEditAccess — Premium", () => {
  const now = new Date("2026-06-15T10:00:00Z");

  it("is unlimited — eligible even immediately after a same-day prior edit", () => {
    expect(
      getBusinessSelfEditAccess({ activePlanId: "premium", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt: now.toISOString(), now }),
    ).toEqual({ eligible: true });
  });

  it("is eligible with no prior edit at all", () => {
    expect(getBusinessSelfEditAccess({ activePlanId: "premium", subscriptionAccess: EDITABLE_ACCESS, lastSelfEditAt: null, now })).toEqual({
      eligible: true,
    });
  });

  it("is still ineligible with no subscription record", () => {
    expect(getBusinessSelfEditAccess({ activePlanId: "premium", subscriptionAccess: null, lastSelfEditAt: null, now })).toEqual({
      eligible: false,
      reason: "no-subscription",
    });
  });

  it("is still ineligible when the subscription itself doesn't permit editing", () => {
    expect(getBusinessSelfEditAccess({ activePlanId: "premium", subscriptionAccess: NOT_EDITABLE_ACCESS, lastSelfEditAt: null, now })).toEqual({
      eligible: false,
      reason: "subscription-not-editable",
    });
  });
});
