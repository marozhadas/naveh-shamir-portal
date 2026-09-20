export type SubscriptionStatus = "trialing" | "active" | "past-due" | "grace-period" | "canceled" | "expired" | "paused";

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
  /** Price/terms assigned when the subscription was created — null on legacy rows created before snapshots existed. */
  billing_interval: "monthly" | "yearly" | null;
  price_amount_ils: number | null;
  price_version: string | null;
  is_launch_price: boolean | null;
  /** Set only by a real billing-failure event (none exists yet — no payment provider is connected). */
  payment_failed_at: string | null;
  grace_period_ends_at: string | null;
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
  billingInterval?: "monthly" | "yearly";
  priceAmountIls?: number;
  priceVersion?: string;
  isLaunchPrice?: boolean;
  paymentFailedAt?: string;
  gracePeriodEndsAt?: string;
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
    | "grace-period"
    | "subscription-canceled"
    | "subscription-paused";
};
