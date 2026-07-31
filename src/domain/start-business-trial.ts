import type { BusinessSubscription } from "@/types/subscription";
import { BUSINESS_MONTHLY_PLAN } from "@/types/subscription-plan";

const TRIAL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure constructor for a brand-new trial subscription — exactly 30 days (spec section 7: never
 * "a calendar month"), starting from `now`. Eligibility (auth, ownership, "already used a trial
 * before") is NOT this function's job — it's checked separately by checkTrialEligibility, and
 * enforced by the repository's createTrial() before this is ever called, so this stays a plain,
 * trivially-testable object constructor.
 */
export function startBusinessTrial(businessId: string, ownerId: string, now: Date): BusinessSubscription {
  const nowIso = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * MS_PER_DAY).toISOString();

  return {
    id: `sub-${businessId}-${now.getTime()}`,
    businessId,
    ownerId,
    planId: BUSINESS_MONTHLY_PLAN.id,
    status: "trialing",
    trialStartedAt: nowIso,
    trialEndsAt,
    cancelAtPeriodEnd: false,
    paymentProvider: "mock",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
