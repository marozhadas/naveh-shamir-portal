import { buildSubscriptionPlan } from "./build-subscription-plan";

/**
 * Which registration of a signed-in owner is still missing its step 6 (the saved payment method) - pure, no I/O, no secrets.
 * A registration qualifies only when ALL of these hold:
 *   - it belongs to this user,
 *   - it is still "pending",
 *   - it is a paid plan (plus / premium) with a valid plan, billing track and offer,
 *   - it has no saved payment method and no subscription.
 * An approved, rejected or free registration, or one that already has a card or a subscription, never qualifies. If there are
 * several (it should not happen), the newest one is offered - nothing is ever created for any of them.
 */
export type PaymentResumeCandidate = {
  id: string;
  owner_id: string | null;
  status: string;
  plan_tier: string;
  selected_billing_interval: string | null;
  offer_code: string | null;
  business_name: string;
  created_at: string;
};

export type PaymentResumeRegistration = { registrationId: string; planTier: "plus" | "premium"; billingInterval: "monthly" | "yearly"; businessName: string };

export function pickRegistrationAwaitingPayment(
  candidates: PaymentResumeCandidate[],
  userId: string,
  idsWithSavedPaymentMethod: ReadonlySet<string>,
  idsWithSubscription: ReadonlySet<string>,
  now: Date = new Date(),
): PaymentResumeRegistration | null {
  const eligible = candidates
    .filter((row) => row.owner_id === userId && row.status === "pending" && (row.plan_tier === "plus" || row.plan_tier === "premium"))
    .filter((row) => !idsWithSavedPaymentMethod.has(row.id) && !idsWithSubscription.has(row.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  for (const row of eligible) {
    const plan = buildSubscriptionPlan(row, now);
    if (!plan.ok) continue;
    return { registrationId: row.id, planTier: plan.plan.planId, billingInterval: plan.plan.interval, businessName: row.business_name };
  }
  return null;
}
