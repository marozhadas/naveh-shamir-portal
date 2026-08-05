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
    activePlanId: "basic",
    ...overrides,
  };
}

function makeSubscription(overrides: Partial<BusinessSubscription> = {}): BusinessSubscription {
  return {
    id: "sub1",
    businessId: "b1",
    ownerId: "owner1",
    planId: "premium",
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
  it("approved business with no subscription and activePlanId=basic -> basic, still appears in archive", () => {
    const access = getBusinessListingAccess(makeBusiness(), null, NOW);
    expect(access.tier).toBe("basic");
    expect(access.canAppearInArchive).toBe(true);
    expect(access.canOpenProfile).toBe(false);
    expect(access.canShowVerifiedBadge).toBe(false);
    expect(access.reason).toBe("basic-listing");
  });

  // The core bug fix: a chosen plan (subscription.planId, or the registration's plan_tier) never
  // by itself grants access — only business.activePlanId does. This is what makes a Plus/Premium
  // registration correctly show as Basic until it's actually activated (by a trial or an admin).
  it("subscription exists and is active, but activePlanId is still basic -> basic (not yet activated)", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "basic" }), makeSubscription({ status: "active" }), NOW);
    expect(access.tier).toBe("basic");
  });

  it("activePlanId=plus with no subscription at all -> plus, granted by an admin (reason: admin-granted)", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "plus" }), null, NOW);
    expect(access.tier).toBe("plus");
    expect(access.canOpenProfile).toBe(true);
    expect(access.canShowVerifiedBadge).toBe(false);
    expect(access.reason).toBe("admin-granted");
  });

  it("activePlanId=premium with no subscription at all -> premium, granted by an admin", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), null, NOW);
    expect(access.tier).toBe("premium");
    expect(access.canShowVerifiedBadge).toBe(true);
    expect(access.reason).toBe("admin-granted");
  });

  it("activePlanId=premium + active trial -> premium, reason trial-active", () => {
    const subscription = makeSubscription({ status: "trialing", trialEndsAt: "2026-07-01T00:00:00.000Z" });
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), subscription, NOW);
    expect(access.tier).toBe("premium");
    expect(access.canOpenProfile).toBe(true);
    expect(access.canShowVerifiedBadge).toBe(true);
    expect(access.reason).toBe("trial-active");
  });

  it("activePlanId=plus + active trial -> plus (not premium), even though the trial subscription itself carries no tier info anymore", () => {
    const subscription = makeSubscription({ status: "trialing", trialEndsAt: "2026-07-01T00:00:00.000Z" });
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "plus" }), subscription, NOW);
    expect(access.tier).toBe("plus");
    expect(access.canShowVerifiedBadge).toBe(false);
  });

  it("expired trial -> basic regardless of activePlanId (automatic safety net)", () => {
    const subscription = makeSubscription({ status: "trialing", trialEndsAt: "2026-06-01T00:00:00.000Z" });
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), subscription, NOW);
    expect(access.tier).toBe("basic");
    expect(access.canAppearInArchive).toBe(true);
    expect(access.reason).toBe("subscription-expired");
  });

  it("active subscription + activePlanId=premium -> premium", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), makeSubscription({ status: "active" }), NOW);
    expect(access.tier).toBe("premium");
    expect(access.reason).toBe("subscription-active");
  });

  it("past-due -> basic regardless of activePlanId (no grace period)", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), makeSubscription({ status: "past-due" }), NOW);
    expect(access.tier).toBe("basic");
    expect(access.reason).toBe("subscription-past-due");
  });

  it("canceled but within the paid period (cancelAtPeriodEnd) -> full access until currentPeriodEndsAt", () => {
    const subscription = makeSubscription({
      status: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEndsAt: "2026-07-01T00:00:00.000Z",
    });
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), subscription, NOW);
    expect(access.tier).toBe("premium");
  });

  it("canceled past currentPeriodEndsAt -> basic regardless of activePlanId", () => {
    const subscription = makeSubscription({
      status: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEndsAt: "2026-06-01T00:00:00.000Z",
    });
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), subscription, NOW);
    expect(access.tier).toBe("basic");
  });

  it("canceled without cancelAtPeriodEnd -> basic immediately", () => {
    const subscription = makeSubscription({ status: "canceled", cancelAtPeriodEnd: false, currentPeriodEndsAt: "2026-07-01T00:00:00.000Z" });
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), subscription, NOW);
    expect(access.tier).toBe("basic");
  });

  it("expired subscription -> basic regardless of activePlanId", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), makeSubscription({ status: "expired" }), NOW);
    expect(access.tier).toBe("basic");
  });

  it("paused subscription -> basic regardless of activePlanId", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), makeSubscription({ status: "paused" }), NOW);
    expect(access.tier).toBe("basic");
  });

  it("suspended business -> not shown at all, regardless of activePlanId/subscription", () => {
    const access = getBusinessListingAccess(makeBusiness({ status: "suspended", activePlanId: "premium" }), makeSubscription({ status: "active" }), NOW);
    expect(access.canAppearInArchive).toBe(false);
    expect(access.canOpenProfile).toBe(false);
    expect(access.reason).toBe("business-suspended");
  });

  it("archived business -> not shown at all", () => {
    const access = getBusinessListingAccess(makeBusiness({ status: "archived" }), null, NOW);
    expect(access.canAppearInArchive).toBe(false);
  });

  it("draft / pending-review business -> not shown, regardless of activePlanId/subscription", () => {
    const draft = getBusinessListingAccess(makeBusiness({ status: "draft", activePlanId: "premium" }), makeSubscription({ status: "active" }), NOW);
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

  it("a business with no activePlanId field at all defaults to basic (legacy records predating the column)", () => {
    const business = makeBusiness();
    delete business.activePlanId;
    const access = getBusinessListingAccess(business, makeSubscription({ status: "active" }), NOW);
    expect(access.tier).toBe("basic");
  });

  it("basic never gets the verified badge or the full-profile content flags", () => {
    const access = getBusinessListingAccess(makeBusiness(), null, NOW);
    expect(access.canShowVerifiedBadge).toBe(false);
    expect(access.canShowGallery).toBe(false);
    expect(access.canShowServices).toBe(false);
    expect(access.canShowOpeningHours).toBe(false);
  });

  it("premium gets the verified badge and full content flags", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), makeSubscription({ status: "active" }), NOW);
    expect(access.canShowVerifiedBadge).toBe(true);
    expect(access.canShowGallery).toBe(true);
    expect(access.canShowServices).toBe(true);
    expect(access.canShowOpeningHours).toBe(true);
    expect(access.canSelfEdit).toBe(true);
  });

  it("plus plan gets the full profile (gallery/services/hours) but never the verified badge or self-edit", () => {
    const access = getBusinessListingAccess(makeBusiness({ activePlanId: "plus" }), makeSubscription({ status: "active" }), NOW);
    expect(access.tier).toBe("plus");
    expect(access.canOpenProfile).toBe(true);
    expect(access.canShowGallery).toBe(true);
    expect(access.canShowServices).toBe(true);
    expect(access.canShowOpeningHours).toBe(true);
    expect(access.canShowVerifiedBadge).toBe(false);
    expect(access.canSelfEdit).toBe(false);
  });

  it("basic tier never gets self-edit access", () => {
    const access = getBusinessListingAccess(makeBusiness(), null, NOW);
    expect(access.canSelfEdit).toBe(false);
  });

  it("only activePlanId=premium is eligible for homepage-featured placement", () => {
    const premium = getBusinessListingAccess(makeBusiness({ activePlanId: "premium" }), makeSubscription({ status: "active" }), NOW);
    expect(premium.canBeHomepageFeatured).toBe(true);

    const plus = getBusinessListingAccess(makeBusiness({ activePlanId: "plus" }), makeSubscription({ status: "active" }), NOW);
    expect(plus.canBeHomepageFeatured).toBe(false);

    const basic = getBusinessListingAccess(makeBusiness(), null, NOW);
    expect(basic.canBeHomepageFeatured).toBe(false);
  });
});
