import type { BusinessSubscription, SubscriptionStatus } from "@/types/subscription";

export interface SubscriptionRepository {
  getByBusinessId(businessId: string): Promise<BusinessSubscription | null>;
  createTrial(businessId: string, ownerId: string): Promise<BusinessSubscription>;
  updateStatus(subscriptionId: string, status: SubscriptionStatus): Promise<BusinessSubscription>;
  /** Sets/unsets cancelAtPeriodEnd without changing `status` itself — the business stays live until the paid period actually ends (spec section 39). */
  setCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<BusinessSubscription>;
}
