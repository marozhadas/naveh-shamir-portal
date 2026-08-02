import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/types/auth";

// mock-subscription-repository.ts transitively imports "server-only"-guarded modules
// (supabase-subscription-service.ts, mock-business-repository.ts's admin-client import) — stubbed
// the same way src/app/business/register/actions.test.ts does. None of the tests below touch
// Supabase: every business id used here is a static mock id ("d1", "d2", ...), which the
// repository routes entirely to its in-memory store, never to the real service functions.
vi.mock("server-only", () => ({}));

const { subscriptionRepository } = await import("./mock-subscription-repository");

function makeUser(id: string, ownedBusinessIds: string[]): AuthenticatedUser {
  return { id, name: id, role: "business-owner", ownedBusinessIds };
}

describe("MockSubscriptionRepository — mock (non-Supabase) business ids", () => {
  it("getByBusinessId returns the seeded subscription for a known mock business", async () => {
    const subscription = await subscriptionRepository.getByBusinessId("d1");
    expect(subscription?.status).toBe("active");
  });

  it("getByBusinessId returns null for a business with no subscription yet", async () => {
    const subscription = await subscriptionRepository.getByBusinessId("d2");
    expect(subscription).toBeNull();
  });

  it("checkTrialEligibility: owner with no prior subscription is eligible", async () => {
    const result = await subscriptionRepository.checkTrialEligibility("d2", makeUser("owner-2", ["d2"]));
    expect(result).toEqual({ eligible: true, reason: "eligible" });
  });

  it("checkTrialEligibility: an existing active subscription blocks a new trial", async () => {
    const result = await subscriptionRepository.checkTrialEligibility("d1", makeUser("owner-1", ["d1"]));
    expect(result).toEqual({ eligible: false, reason: "active-subscription" });
  });

  it("checkTrialEligibility: an existing trialing subscription blocks a second trial", async () => {
    const result = await subscriptionRepository.checkTrialEligibility("d3", makeUser("owner-3", ["d3"]));
    expect(result).toEqual({ eligible: false, reason: "active-subscription" });
  });

  it("checkTrialEligibility: a previously expired subscription counts as already used", async () => {
    const result = await subscriptionRepository.checkTrialEligibility("d15", makeUser("owner-15", ["d15"]));
    expect(result).toEqual({ eligible: false, reason: "trial-already-used" });
  });

  it("checkTrialEligibility: a canceled subscription still within its paid period counts as already used", async () => {
    const result = await subscriptionRepository.checkTrialEligibility("d13", makeUser("owner-13", ["d13"]));
    expect(result).toEqual({ eligible: false, reason: "trial-already-used" });
  });

  it("checkTrialEligibility: a user who doesn't own the business is refused", async () => {
    const result = await subscriptionRepository.checkTrialEligibility("d2", makeUser("someone-else", []));
    expect(result).toEqual({ eligible: false, reason: "business-not-owned" });
  });

  it("createTrial: creates a trialing subscription for a business with none yet", async () => {
    const subscription = await subscriptionRepository.createTrial("d-test-create-once", "owner-test-create-once");
    expect(subscription.status).toBe("trialing");
    expect(subscription.businessId).toBe("d-test-create-once");
  });

  it("createTrial: a second attempt for the same business is refused, not silently overwritten", async () => {
    await subscriptionRepository.createTrial("d-test-create-twice", "owner-test-create-twice");
    await expect(subscriptionRepository.createTrial("d-test-create-twice", "owner-test-create-twice")).rejects.toThrow(/only be used once/);
  });

  it("expireDueTrials: flips a trialing subscription whose trialEndsAt has passed to expired", async () => {
    await subscriptionRepository.createTrial("d-test-expire", "owner-test-expire");
    const subscriptionBefore = await subscriptionRepository.getByBusinessId("d-test-expire");
    const farFuture = new Date(new Date(subscriptionBefore!.trialEndsAt).getTime() + 1000);

    await subscriptionRepository.expireDueTrials(farFuture);

    const subscriptionAfter = await subscriptionRepository.getByBusinessId("d-test-expire");
    expect(subscriptionAfter?.status).toBe("expired");
  });

  it("expireDueTrials: leaves a still-active trial untouched", async () => {
    await subscriptionRepository.createTrial("d-test-not-due", "owner-test-not-due");
    const now = new Date();

    await subscriptionRepository.expireDueTrials(now);

    const subscription = await subscriptionRepository.getByBusinessId("d-test-not-due");
    expect(subscription?.status).toBe("trialing");
  });

  it("expireDueTrials: never touches an already-active paid subscription", async () => {
    await subscriptionRepository.expireDueTrials(new Date("2099-01-01T00:00:00.000Z"));
    const subscription = await subscriptionRepository.getByBusinessId("d1");
    expect(subscription?.status).toBe("active");
  });
});

describe("MockSubscriptionRepository — Supabase-backed (reg-) business ids without Supabase configured", () => {
  it("getByBusinessId returns null rather than throwing", async () => {
    const subscription = await subscriptionRepository.getByBusinessId("reg-00000000-0000-0000-0000-000000000000");
    expect(subscription).toBeNull();
  });

  it("checkTrialEligibility fails closed instead of granting a trial", async () => {
    const result = await subscriptionRepository.checkTrialEligibility(
      "reg-00000000-0000-0000-0000-000000000000",
      makeUser("owner-x", ["reg-00000000-0000-0000-0000-000000000000"]),
    );
    expect(result.eligible).toBe(false);
  });

  it("createTrial refuses rather than silently succeeding", async () => {
    await expect(subscriptionRepository.createTrial("reg-00000000-0000-0000-0000-000000000000", "owner-x")).rejects.toThrow();
  });
});
