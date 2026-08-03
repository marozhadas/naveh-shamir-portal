import { describe, expect, it, vi } from "vitest";
import type { AdminSubscriptionSummary } from "./subscription-summary";
import type { BusinessSubscription } from "@/types/subscription";
import type { BusinessListingAccess } from "@/types/business-listing-access";

// subscription-summary.ts transitively imports "server-only"-guarded repository modules — stubbed
// here the same way src/app/business/register/actions.test.ts does, since this file only exercises
// the pure matchesSubscriptionFilter() function, never anything that actually touches Supabase.
vi.mock("server-only", () => ({}));

const { matchesSubscriptionFilter } = await import("./subscription-summary");

function makeSummary(overrides: Partial<AdminSubscriptionSummary> = {}): AdminSubscriptionSummary {
  const access: BusinessListingAccess = {
    canAppearInArchive: true,
    canOpenProfile: false,
    canShowVerifiedBadge: false,
    canShowFullContactDetails: false,
    canShowGallery: false,
    canShowServices: false,
    canShowOpeningHours: false,
    canSelfEdit: false,
    canBeHomepageFeatured: false,
    tier: "basic",
    reason: "basic-listing",
  };
  return { subscription: null, access, daysRemaining: null, ...overrides };
}

function makeSubscription(overrides: Partial<BusinessSubscription> = {}): BusinessSubscription {
  return {
    id: "sub-1",
    businessId: "reg-1",
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

describe("matchesSubscriptionFilter", () => {
  it("'all' matches everything", () => {
    expect(matchesSubscriptionFilter(makeSummary(), "all")).toBe(true);
  });

  it("'no-subscription' matches only when there's no subscription row", () => {
    expect(matchesSubscriptionFilter(makeSummary({ subscription: null }), "no-subscription")).toBe(true);
    expect(matchesSubscriptionFilter(makeSummary({ subscription: makeSubscription() }), "no-subscription")).toBe(false);
  });

  it("'trialing' / 'active' / 'expired' match the subscription's own status", () => {
    expect(matchesSubscriptionFilter(makeSummary({ subscription: makeSubscription({ status: "trialing" }) }), "trialing")).toBe(true);
    expect(matchesSubscriptionFilter(makeSummary({ subscription: makeSubscription({ status: "active" }) }), "active")).toBe(true);
    expect(matchesSubscriptionFilter(makeSummary({ subscription: makeSubscription({ status: "expired" }) }), "expired")).toBe(true);
    expect(matchesSubscriptionFilter(makeSummary({ subscription: makeSubscription({ status: "active" }) }), "trialing")).toBe(false);
  });

  it("'basic' / 'premium' match the derived listing tier, independent of subscription status", () => {
    const premiumSummary = makeSummary({
      subscription: makeSubscription({ status: "active" }),
      access: { ...makeSummary().access, tier: "premium", canOpenProfile: true },
    });
    expect(matchesSubscriptionFilter(premiumSummary, "premium")).toBe(true);
    expect(matchesSubscriptionFilter(premiumSummary, "basic")).toBe(false);
    expect(matchesSubscriptionFilter(makeSummary(), "basic")).toBe(true);
  });
});
