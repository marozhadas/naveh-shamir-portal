import { describe, expect, it } from "vitest";
import { computeGracePeriodEnd, GRACE_PERIOD_DAYS } from "./subscription-grace-period";
import { getSubscriptionAccess } from "./get-subscription-access";
import type { BusinessSubscription } from "@/types/subscription";

const NOW = new Date("2026-09-20T12:00:00.000Z");

function makeGrace(gracePeriodEndsAt: string): BusinessSubscription {
  return {
    id: "s",
    businessId: "reg-1",
    ownerId: "o",
    planId: "plus",
    status: "grace-period",
    trialStartedAt: "2026-08-01T00:00:00.000Z",
    trialEndsAt: "2026-08-31T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    paymentFailedAt: "2026-09-19T00:00:00.000Z",
    gracePeriodEndsAt,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
  };
}

describe("grace period", () => {
  it("is 7 days after the billing failure", () => {
    expect(GRACE_PERIOD_DAYS).toBe(7);
    expect(computeGracePeriodEnd(new Date("2026-09-20T12:00:00.000Z")).toISOString()).toBe("2026-09-27T12:00:00.000Z");
  });

  it("keeps the page live and editable while the grace period has not ended", () => {
    const access = getSubscriptionAccess(makeGrace("2026-09-25T00:00:00.000Z"), NOW);
    expect(access.reason).toBe("grace-period");
    expect(access.canPublish).toBe(true);
    expect(access.canEdit).toBe(true);
  });

  it("drops access once the grace period has ended, without deleting anything", () => {
    const access = getSubscriptionAccess(makeGrace("2026-09-19T00:00:00.000Z"), NOW);
    expect(access.canPublish).toBe(false);
    expect(access.canAppearInArchive).toBe(false);
    expect(access.canPreview).toBe(true);
  });

  it("a grace-period row with no end date grants nothing (fails closed)", () => {
    const sub = { ...makeGrace("2026-09-25T00:00:00.000Z"), gracePeriodEndsAt: undefined };
    expect(getSubscriptionAccess(sub, NOW).canPublish).toBe(false);
  });
});
