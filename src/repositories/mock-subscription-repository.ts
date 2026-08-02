import { startBusinessTrial } from "@/domain/start-business-trial";
import { checkTrialEligibility as checkMockTrialEligibility } from "@/domain/check-trial-eligibility";
import { businessRepository } from "./mock-business-repository";
import {
  checkRealTrialEligibility,
  expireDueRealTrials,
  getRealSubscriptionByBusinessId,
  startRealBusinessTrial,
} from "./supabase-subscription-service";
import { isSupabaseBusinessId } from "@/utils/business-id";
import type { AuthenticatedUser } from "@/types/auth";
import type { BusinessSubscription, SubscriptionStatus } from "@/types/subscription";
import type { TrialEligibility } from "@/types/trial";
import type { SubscriptionRepository } from "./subscription-repository";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Seed data anchored to `Date.now()` at module load (not hardcoded ISO strings) so the demo
 * stays meaningful whenever it's actually run, instead of drifting into "already expired" after
 * enough real time passes. Mirrors the five demo businesses in src/data/business-profiles.ts:
 * d1 active, d3 trialing (~18 days left), d13 canceled (still within its paid period),
 * d2 no subscription yet (never started a trial), d15 expired (trial ended, unpaid).
 */
function buildSeed(): BusinessSubscription[] {
  const now = Date.now();
  return [
    {
      id: "sub-d1",
      businessId: "d1",
      ownerId: "owner-1",
      planId: "business-monthly",
      status: "active",
      trialStartedAt: new Date(now - 60 * DAY_MS).toISOString(),
      trialEndsAt: new Date(now - 30 * DAY_MS).toISOString(),
      currentPeriodStartedAt: new Date(now - 30 * DAY_MS).toISOString(),
      currentPeriodEndsAt: new Date(now + 5 * DAY_MS).toISOString(),
      cancelAtPeriodEnd: false,
      paymentProvider: "mock",
      providerCustomerId: "mock-cus-d1",
      providerSubscriptionId: "mock-sub-d1",
      createdAt: new Date(now - 60 * DAY_MS).toISOString(),
      updatedAt: new Date(now - 30 * DAY_MS).toISOString(),
    },
    {
      id: "sub-d3",
      businessId: "d3",
      ownerId: "owner-3",
      planId: "business-monthly",
      status: "trialing",
      trialStartedAt: new Date(now - 12 * DAY_MS).toISOString(),
      trialEndsAt: new Date(now + 18 * DAY_MS).toISOString(),
      cancelAtPeriodEnd: false,
      paymentProvider: "mock",
      createdAt: new Date(now - 12 * DAY_MS).toISOString(),
      updatedAt: new Date(now - 12 * DAY_MS).toISOString(),
    },
    {
      id: "sub-d13",
      businessId: "d13",
      ownerId: "owner-13",
      planId: "business-monthly",
      status: "canceled",
      trialStartedAt: new Date(now - 90 * DAY_MS).toISOString(),
      trialEndsAt: new Date(now - 60 * DAY_MS).toISOString(),
      currentPeriodStartedAt: new Date(now - 20 * DAY_MS).toISOString(),
      currentPeriodEndsAt: new Date(now + 10 * DAY_MS).toISOString(),
      canceledAt: new Date(now - 2 * DAY_MS).toISOString(),
      cancelAtPeriodEnd: true,
      paymentProvider: "mock",
      providerCustomerId: "mock-cus-d13",
      providerSubscriptionId: "mock-sub-d13",
      createdAt: new Date(now - 90 * DAY_MS).toISOString(),
      updatedAt: new Date(now - 2 * DAY_MS).toISOString(),
    },
    {
      id: "sub-d15",
      businessId: "d15",
      ownerId: "owner-15",
      planId: "business-monthly",
      status: "expired",
      trialStartedAt: new Date(now - 45 * DAY_MS).toISOString(),
      trialEndsAt: new Date(now - 15 * DAY_MS).toISOString(),
      cancelAtPeriodEnd: false,
      paymentProvider: "mock",
      createdAt: new Date(now - 45 * DAY_MS).toISOString(),
      updatedAt: new Date(now - 15 * DAY_MS).toISOString(),
    },
  ];
}

export class MockSubscriptionRepository implements SubscriptionRepository {
  private readonly store: Map<string, BusinessSubscription> = new Map(
    buildSeed().map((subscription) => [subscription.businessId, subscription]),
  );

  async getByBusinessId(businessId: string): Promise<BusinessSubscription | null> {
    if (isSupabaseBusinessId(businessId)) return getRealSubscriptionByBusinessId(businessId);
    return this.store.get(businessId) ?? null;
  }

  /**
   * Routes to the real, DB-verified check for Supabase-backed businesses (auth/ownership/approval/
   * one-time-use all re-checked server-side against business_registrations + business_subscriptions
   * — see supabase-subscription-service.ts) or to the existing sync domain check for demo
   * businesses, which have no separate "approval" concept and are looked up from the in-memory
   * store instead.
   */
  async checkTrialEligibility(businessId: string, user: AuthenticatedUser): Promise<TrialEligibility> {
    if (isSupabaseBusinessId(businessId)) {
      return checkRealTrialEligibility(businessId, user.id);
    }
    const business = await businessRepository.getDraftById(businessId, user.id);
    if (!business) return { eligible: false, reason: "business-not-owned" };
    const existingSubscription = await this.getByBusinessId(businessId);
    return checkMockTrialEligibility(business, existingSubscription, user);
  }

  /**
   * Eligibility (auth/ownership/"already used") is the caller's responsibility — checked via
   * checkTrialEligibility() before this is ever invoked (spec section 34). This still refuses to
   * silently overwrite an existing record, as a last line of defense against re-entrant misuse.
   */
  async createTrial(businessId: string, ownerId: string): Promise<BusinessSubscription> {
    if (isSupabaseBusinessId(businessId)) {
      const result = await startRealBusinessTrial(businessId, ownerId);
      if (result.success) return result.subscription;
      throw new Error(
        result.reason === "already-exists"
          ? `A subscription already exists for business "${businessId}" — a trial can only be used once.`
          : "Unable to start trial for this business right now.",
      );
    }
    if (this.store.has(businessId)) {
      throw new Error(`A subscription already exists for business "${businessId}" — a trial can only be used once.`);
    }
    const subscription = startBusinessTrial(businessId, ownerId, new Date());
    this.store.set(businessId, subscription);
    return subscription;
  }

  async updateStatus(subscriptionId: string, status: SubscriptionStatus): Promise<BusinessSubscription> {
    const existing = [...this.store.values()].find((entry) => entry.id === subscriptionId);
    if (!existing) throw new Error(`No subscription found with id "${subscriptionId}"`);
    const updated: BusinessSubscription = { ...existing, status, updatedAt: new Date().toISOString() };
    this.store.set(existing.businessId, updated);
    return updated;
  }

  async setCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<BusinessSubscription> {
    const existing = [...this.store.values()].find((entry) => entry.id === subscriptionId);
    if (!existing) throw new Error(`No subscription found with id "${subscriptionId}"`);
    const updated: BusinessSubscription = {
      ...existing,
      cancelAtPeriodEnd,
      canceledAt: cancelAtPeriodEnd ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(existing.businessId, updated);
    return updated;
  }

  /**
   * The in-memory half of expiry (for the static demo businesses) plus a call into the real
   * Postgres function used by the hourly pg_cron job (see supabase-subscription-service.ts) —
   * this lets an admin/ops action or a test trigger the exact same expiry logic on demand,
   * instead of only ever running on the cron schedule.
   */
  async expireDueTrials(now: Date): Promise<number> {
    let mockExpiredCount = 0;
    for (const [businessId, subscription] of this.store.entries()) {
      if (subscription.status === "trialing" && new Date(subscription.trialEndsAt).getTime() <= now.getTime()) {
        this.store.set(businessId, { ...subscription, status: "expired", updatedAt: now.toISOString() });
        mockExpiredCount++;
      }
    }
    const realExpiredCount = await expireDueRealTrials();
    return mockExpiredCount + realExpiredCount;
  }
}

export const subscriptionRepository = new MockSubscriptionRepository();
