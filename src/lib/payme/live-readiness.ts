/**
 * Live readiness of the REGISTRATIONS (pure, no I/O, no secrets): a paid (plus / premium) business that is still pending
 * and has no saved payment method cannot be approved once PayMe is live (the admin's approval creates the subscription from the
 * card saved in registration step 6), and there is deliberately no page to add a card to an existing registration. Such
 * businesses must be handled before PAYME_ENV is switched to "live".
 *
 * Only ids and names are reported - never anything about the card, and never the buyer_key.
 */
export type LiveReadinessRegistration = { id: string; business_name: string; plan_tier: string; status: string };

export type LiveReadinessIssue = { id: string; businessName: string; planTier: "plus" | "premium" };

export function findLiveReadinessIssues(registrations: LiveReadinessRegistration[], idsWithSavedPaymentMethod: ReadonlySet<string>): LiveReadinessIssue[] {
  const issues: LiveReadinessIssue[] = [];
  for (const registration of registrations) {
    if (registration.status !== "pending") continue;
    if (registration.plan_tier !== "plus" && registration.plan_tier !== "premium") continue;
    if (idsWithSavedPaymentMethod.has(registration.id)) continue;
    issues.push({ id: registration.id, businessName: registration.business_name, planTier: registration.plan_tier });
  }
  return issues;
}
