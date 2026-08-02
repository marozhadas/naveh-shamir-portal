import { describe, expect, it } from "vitest";
import { getBusinessListingAccess } from "./get-business-listing-access";
import type { Business } from "@/types/business";
import type { BusinessSubscription } from "@/types/subscription";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "b1",
    slug: "b1",
    name: "עסק לדוגמה",
    category: "שירותים",
    description: "תיאור",
    imageUrl: "",
    imageAlt: "",
    status: "published",
    ...overrides,
  };
}

function makeSubscription(overrides: Partial<BusinessSubscription> = {}): BusinessSubscription {
  return {
    id: "sub1",
    businessId: "b1",
    ownerId: "owner1",
    planId: "business-monthly",
    status: "active",
    trialStartedAt: "2026-01-01T00:00:00.000Z",
    trialEndsAt: "2026-01-31T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getBusinessListingAccess", () => {
  it("approved business with no subscription -> basic, still appears in archive", () => {
    const access = getBusinessListingAccess(makeBusiness(), null, NOW);
    expect(access.tier).toBe("basic");
    expect(access.canAppearInArchive).toBe(true);
    expect(access.canOpenProfile).toBe(false);
    expect(access.canShowVerifiedBadge).toBe(false);
    expect(access.reason).toBe("basic-listing");
  });

  it("active trial -> premium", () => {
    const subscription = makeSubscription({ status: "trialing", trialEndsAt: "2026-07-01T00:00:00.000Z" });
    const access = getBusinessListingAccess(makeBusiness(), subscription, NOW);
    expect(access.tier).toBe("premium");
    expect(access.canOpenProfile).toBe(true);
    expect(access.canShowVerifiedBadge).toBe(true);
    expect(access.reason).toBe("trial-active");
  });

  it("expired trial -> basic, business still appears in archive", () => {
    const subscription = makeSubscription({ status: "trialing", trialEndsAt: "2026-06-01T00:00:00.000Z" });
    const access = getBusinessListingAccess(makeBusiness(), subscription, NOW);
    expect(access.tier).toBe("basic");
    expect(access.canAppearInArchive).toBe(true);
    expect(access.reason).toBe("subscription-expired");
  });

  it("active subscription -> premium", () => {
    const access = getBusinessListingAccess(makeBusiness(), makeSubscription({ status: "active" }), NOW);
    expect(access.tier).toBe("premium");
    expect(access.reason).toBe("subscription-active");
  });

  it("past-due -> basic (no grace period)", () => {
    const access = getBusinessListingAccess(makeBusiness(), makeSubscription({ status: "past-due" }), NOW);
    expect(access.tier).toBe("basic");
    expect(access.reason).toBe("subscription-past-due");
  });

  it("canceled but within the paid period (cancelAtPeriodEnd) -> premium until currentPeriodEndsAt", () => {
    const subscription = makeSubscription({
      status: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEndsAt: "2026-07-01T00:00:00.000Z",
    });
    const access = getBusinessListingAccess(makeBusiness(), subscription, NOW);
    expect(access.tier).toBe("premium");
  });

  it("canceled past currentPeriodEndsAt -> basic", () => {
    const subscription = makeSubscription({
      status: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEndsAt: "2026-06-01T00:00:00.000Z",
    });
    const access = getBusinessListingAccess(makeBusiness(), subscription, NOW);
    expect(access.tier).toBe("basic");
  });

  it("canceled without cancelAtPeriodEnd -> basic immediately", () => {
    const subscription = makeSubscription({ status: "canceled", cancelAtPeriodEnd: false, currentPeriodEndsAt: "2026-07-01T00:00:00.000Z" });
    const access = getBusinessListingAccess(makeBusiness(), subscription, NOW);
    expect(access.tier).toBe("basic");
  });

  it("expired subscription -> basic", () => {
    const access = getBusinessListingAccess(makeBusiness(), makeSubscription({ status: "expired" }), NOW);
    expect(access.tier).toBe("basic");
  });

  it("paused subscription -> basic", () => {
    const access = getBusinessListingAccess(makeBusiness(), makeSubscription({ status: "paused" }), NOW);
    expect(access.tier).toBe("basic");
  });

  it("suspended business -> not shown at all, regardless of subscription", () => {
    const access = getBusinessListingAccess(makeBusiness({ status: "suspended" }), makeSubscription({ status: "active" }), NOW);
    expect(access.canAppearInArchive).toBe(false);
    expect(access.canOpenProfile).toBe(false);
    expect(access.reason).toBe("business-suspended");
  });

  it("archived business -> not shown at all", () => {
    const access = getBusinessListingAccess(makeBusiness({ status: "archived" }), null, NOW);
    expect(access.canAppearInArchive).toBe(false);
  });

  it("draft / pending-review business -> not shown, regardless of subscription", () => {
    const draft = getBusinessListingAccess(makeBusiness({ status: "draft" }), makeSubscription({ status: "active" }), NOW);
    expect(draft.canAppearInArchive).toBe(false);
    expect(draft.reason).toBe("business-not-approved");

    const pending = getBusinessListingAccess(makeBusiness({ status: "pending-review" }), null, NOW);
    expect(pending.canAppearInArchive).toBe(false);
  });

  it("a business with no status field at all defaults to published (legacy records)", () => {
    const business = makeBusiness();
    delete business.status;
    const access = getBusinessListingAccess(business, null, NOW);
    expect(access.canAppearInArchive).toBe(true);
  });

  it("basic never gets the verified badge or a public URL's worth of content flags", () => {
    const access = getBusinessListingAccess(makeBusiness(), null, NOW);
    expect(access.canShowVerifiedBadge).toBe(false);
    expect(access.canShowGallery).toBe(false);
    expect(access.canShowServices).toBe(false);
    expect(access.canShowOpeningHours).toBe(false);
  });

  it("premium gets the verified badge and full content flags", () => {
    const access = getBusinessListingAccess(makeBusiness(), makeSubscription({ status: "active" }), NOW);
    expect(access.canShowVerifiedBadge).toBe(true);
    expect(access.canShowGallery).toBe(true);
    expect(access.canShowServices).toBe(true);
    expect(access.canShowOpeningHours).toBe(true);
  });
});
