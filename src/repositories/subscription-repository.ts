import type { AuthenticatedUser } from "@/types/auth";
import type { BusinessSubscription, SubscriptionStatus } from "@/types/subscription";
import type { TrialEligibility } from "@/types/trial";

export interface SubscriptionRepository {
  getByBusinessId(businessId: string): Promise<BusinessSubscription | null>;
  /** Re-checks auth/ownership/approval/one-time-use fresh — never trusts anything the caller already believes about eligibility. */
  checkTrialEligibility(businessId: string, user: AuthenticatedUser): Promise<TrialEligibility>;
  createTrial(businessId: string, ownerId: string): Promise<BusinessSubscription>;
  updateStatus(subscriptionId: string, status: SubscriptionStatus): Promise<BusinessSubscription>;
  /** Sets/unsets cancelAtPeriodEnd without changing `status` itself — the business stays live until the paid period actually ends (spec section 39). */
  setCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<BusinessSubscription>;
  /** Flips due trials (trialEndsAt <= now) to expired — for mock data in-process, for real data via the same Postgres function the hourly pg_cron job calls. Returns the total number of rows changed. */
  expireDueTrials(now: Date): Promise<number>;
}
