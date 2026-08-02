export type SubscriptionStatus = "trialing" | "active" | "past-due" | "canceled" | "expired" | "paused";

/**
 * Mirrors the public.business_subscriptions table (see create_business_subscriptions migration).
 * The DB columns are nullable (a subscription could in principle exist without ever having had a
 * trial), but in this system every row is created exclusively by startBusinessTrial(), which
 * always sets trial_started_at/trial_ends_at — so mapSubscriptionRowToBusinessSubscription()
 * below safely treats them as always-present when mapping to the app-facing BusinessSubscription
 * shape below, instead of pushing `| null` handling into every UI component that already assumes
 * (correctly, for this system) that a subscription always has trial dates.
 */
export type BusinessSubscriptionRow = {
  id: string;
  business_registration_id: string;
  owner_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

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
