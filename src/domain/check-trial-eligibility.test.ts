import { describe, expect, it } from "vitest";
import { checkTrialEligibility } from "./check-trial-eligibility";
import type { Business } from "@/types/business";
import type { AuthenticatedUser } from "@/types/auth";
import type { BusinessSubscription } from "@/types/subscription";

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    slug: "biz-1",
    name: "עסק",
    category: "שירותים",
    description: "",
    imageUrl: "",
    imageAlt: "",
    ownerId: "owner-1",
    ...overrides,
  };
}

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { id: "owner-1", name: "בעל העסק", role: "business-owner", ownedBusinessIds: ["biz-1"], ...overrides };
}

function makeSubscription(overrides: Partial<BusinessSubscription> = {}): BusinessSubscription {
  return {
    id: "sub-1",
    businessId: "biz-1",
    ownerId: "owner-1",
    planId: "business-monthly",
    status: "expired",
    trialStartedAt: "2026-01-01T00:00:00.000Z",
    trialEndsAt: "2026-01-31T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("checkTrialEligibility", () => {
  it("not authenticated: never eligible", () => {
    const result = checkTrialEligibility(makeBusiness(), null, null);
    expect(result).toEqual({ eligible: false, reason: "not-authenticated" });
  });

  it("business not owned by the user: refused", () => {
    const result = checkTrialEligibility(makeBusiness(), null, makeUser({ id: "someone-else" }));
    expect(result).toEqual({ eligible: false, reason: "business-not-owned" });
  });

  it("admin can act regardless of ownership", () => {
    const result = checkTrialEligibility(makeBusiness(), null, makeUser({ id: "admin-1", role: "admin" }));
    expect(result.eligible).toBe(true);
  });

  it("owner with no prior subscription: eligible", () => {
    const result = checkTrialEligibility(makeBusiness(), null, makeUser());
    expect(result).toEqual({ eligible: true, reason: "eligible" });
  });

  it("an existing trialing subscription blocks a second trial", () => {
    const result = checkTrialEligibility(makeBusiness(), makeSubscription({ status: "trialing" }), makeUser());
    expect(result).toEqual({ eligible: false, reason: "active-subscription" });
  });

  it("an existing active subscription blocks a new trial", () => {
    const result = checkTrialEligibility(makeBusiness(), makeSubscription({ status: "active" }), makeUser());
    expect(result).toEqual({ eligible: false, reason: "active-subscription" });
  });

  it("a previously expired subscription still counts as 'trial already used'", () => {
    const result = checkTrialEligibility(makeBusiness(), makeSubscription({ status: "expired" }), makeUser());
    expect(result).toEqual({ eligible: false, reason: "trial-already-used" });
  });

  it("a canceled subscription still counts as 'trial already used'", () => {
    const result = checkTrialEligibility(makeBusiness(), makeSubscription({ status: "canceled" }), makeUser());
    expect(result).toEqual({ eligible: false, reason: "trial-already-used" });
  });
});
