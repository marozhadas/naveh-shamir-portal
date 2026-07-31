export type SubscriptionStatus = "trialing" | "active" | "past-due" | "canceled" | "expired" | "paused";

export type BusinessSubscription = {
  id: string;
  businessId: string;
  ownerId: string;
  planId: string;
  status: SubscriptionStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  currentPeriodStartedAt?: string;
  currentPeriodEndsAt?: string;
  canceledAt?: string;
  cancelAtPeriodEnd: boolean;
  paymentProvider?: "mock" | "stripe" | "other";
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * What the current subscription state actually permits — computed once by
 * getSubscriptionAccess() (src/domain/get-subscription-access.ts) so no component has to
 * re-derive this logic from raw subscription fields.
 */
export type SubscriptionAccess = {
  canEdit: boolean;
  canPreview: boolean;
  canPublish: boolean;
  canAppearInArchive: boolean;
  canManageSubscription: boolean;
  daysRemainingInTrial: number | null;
  reason:
    | "trial-active"
    | "subscription-active"
    | "trial-expired"
    | "payment-past-due"
    | "subscription-canceled"
    | "subscription-paused";
};
