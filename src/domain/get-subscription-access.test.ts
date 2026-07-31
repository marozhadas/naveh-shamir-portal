import { describe, expect, it } from "vitest";
import { getSubscriptionAccess } from "./get-subscription-access";
import type { BusinessSubscription } from "@/types/subscription";

const NOW = new Date("2026-06-15T00:00:00.000Z");

function makeSubscription(overrides: Partial<BusinessSubscription>): BusinessSubscription {
  return {
    id: "sub-1",
    businessId: "biz-1",
    ownerId: "owner-1",
    planId: "business-monthly",
    status: "trialing",
    trialStartedAt: "2026-06-01T00:00:00.000Z",
    trialEndsAt: "2026-07-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getSubscriptionAccess", () => {
  it("trialing with time remaining: full access, days remaining computed", () => {
    const access = getSubscriptionAccess(makeSubscription({ status: "trialing" }), NOW);
    expect(access.reason).toBe("trial-active");
    expect(access.canEdit).toBe(true);
    expect(access.canPublish).toBe(true);
    expect(access.canAppearInArchive).toBe(true);
    expect(access.daysRemainingInTrial).toBe(16);
  });

  it("trialing but trialEndsAt already passed: degrades to trial-expired defensively", () => {
    const access = getSubscriptionAccess(
      makeSubscription({ status: "trialing", trialEndsAt: "2026-06-10T00:00:00.000Z" }),
      NOW,
    );
    expect(access.reason).toBe("trial-expired");
    expect(access.canPublish).toBe(false);
    expect(access.canAppearInArchive).toBe(false);
    expect(access.daysRemainingInTrial).toBe(0);
  });

  it("active: full access, no trial days", () => {
    const access = getSubscriptionAccess(makeSubscription({ status: "active" }), NOW);
    expect(access.reason).toBe("subscription-active");
    expect(access.canPublish).toBe(true);
    expect(access.canAppearInArchive).toBe(true);
    expect(access.daysRemainingInTrial).toBeNull();
  });

  it("past-due: no publish/archive access, subscription still manageable", () => {
    const access = getSubscriptionAccess(makeSubscription({ status: "past-due" }), NOW);
    expect(access.reason).toBe("payment-past-due");
    expect(access.canPublish).toBe(false);
    expect(access.canAppearInArchive).toBe(false);
    expect(access.canManageSubscription).toBe(true);
  });

  it("canceled but still within the paid period: stays published", () => {
    const access = getSubscriptionAccess(
      makeSubscription({ status: "canceled", cancelAtPeriodEnd: true, currentPeriodEndsAt: "2026-06-30T00:00:00.000Z" }),
      NOW,
    );
    expect(access.reason).toBe("subscription-canceled");
    expect(access.canPublish).toBe(true);
    expect(access.canAppearInArchive).toBe(true);
  });

  it("canceled after the paid period ended: loses publish/archive access", () => {
    const access = getSubscriptionAccess(
      makeSubscription({ status: "canceled", cancelAtPeriodEnd: true, currentPeriodEndsAt: "2026-06-01T00:00:00.000Z" }),
      NOW,
    );
    expect(access.canPublish).toBe(false);
    expect(access.canAppearInArchive).toBe(false);
  });

  it("expired: content preserved but not editable or publishable", () => {
    const access = getSubscriptionAccess(makeSubscription({ status: "expired" }), NOW);
    expect(access.reason).toBe("trial-expired");
    expect(access.canEdit).toBe(false);
    expect(access.canPublish).toBe(false);
    expect(access.canPreview).toBe(true);
  });

  it("paused: no publish/archive access", () => {
    const access = getSubscriptionAccess(makeSubscription({ status: "paused" }), NOW);
    expect(access.reason).toBe("subscription-paused");
    expect(access.canPublish).toBe(false);
    expect(access.canAppearInArchive).toBe(false);
  });
});
