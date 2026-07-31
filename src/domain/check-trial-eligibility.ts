import type { AuthenticatedUser } from "@/types/auth";
import type { Business } from "@/types/business";
import type { BusinessSubscription } from "@/types/subscription";
import type { TrialEligibility } from "@/types/trial";

/**
 * A trial is granted once per business, ever (spec section 36) — if any subscription record
 * already exists for the business, a new trial is refused regardless of that record's current
 * status (even "expired" or "canceled" counts as "already used", not just "trialing"/"active").
 */
export function checkTrialEligibility(
  business: Business,
  existingSubscription: BusinessSubscription | null,
  user: AuthenticatedUser | null,
): TrialEligibility {
  if (!user) {
    return { eligible: false, reason: "not-authenticated" };
  }

  const ownsBusiness = user.role === "admin" || business.ownerId === user.id;
  if (!ownsBusiness) {
    return { eligible: false, reason: "business-not-owned" };
  }

  if (existingSubscription) {
    if (existingSubscription.status === "trialing" || existingSubscription.status === "active") {
      return { eligible: false, reason: "active-subscription" };
    }
    return { eligible: false, reason: "trial-already-used" };
  }

  return { eligible: true, reason: "eligible" };
}
