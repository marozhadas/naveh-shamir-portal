import type { BusinessSubscription, BusinessSubscriptionRow } from "@/types/subscription";
import { toBusinessId } from "@/utils/business-id";

/**
 * trial_started_at/trial_ends_at are non-null assertions here, not optional chaining — every row
 * in business_subscriptions is created exclusively by startBusinessTrial() (src/lib/business-owner/
 * start-business-trial.ts), which always sets both, so a row existing at all guarantees they're set.
 */
export function mapSubscriptionRowToBusinessSubscription(row: BusinessSubscriptionRow): BusinessSubscription {
  return {
    id: row.id,
    businessId: toBusinessId(row.business_registration_id),
    ownerId: row.owner_id,
    planId: row.plan_id,
    status: row.status,
    trialStartedAt: row.trial_started_at as string,
    trialEndsAt: row.trial_ends_at as string,
    currentPeriodStartedAt: row.current_period_started_at ?? undefined,
    currentPeriodEndsAt: row.current_period_ends_at ?? undefined,
    canceledAt: row.canceled_at ?? undefined,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    billingInterval: row.billing_interval ?? undefined,
    priceAmountIls: row.price_amount_ils ?? undefined,
    priceVersion: row.price_version ?? undefined,
    isLaunchPrice: row.is_launch_price ?? undefined,
    offerCode: row.offer_code ?? undefined,
    trialDays: row.trial_days ?? undefined,
    paymentProvider: row.payment_provider ?? undefined,
    providerSubscriptionId: row.provider_subscription_id ?? undefined,
    providerLastTransactionId: row.provider_last_transaction_id ?? undefined,
    lastPaymentSucceededAt: row.last_payment_succeeded_at ?? undefined,
    lastPaymentFailedAt: row.last_payment_failed_at ?? undefined,
    nextBillingAt: row.next_billing_at ?? undefined,
    paymentFailureReason: row.payment_failure_reason ?? undefined,
    paymentFailedAt: row.payment_failed_at ?? undefined,
    gracePeriodEndsAt: row.grace_period_ends_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
