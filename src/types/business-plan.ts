/**
 * The single central type for a business's plan tier — used everywhere a plan is chosen, stored,
 * displayed, or gated on. "basic" is the free/default tier (the DB column `plan_tier` still spells
 * this "free" for historical reasons — see BusinessRegistrationRow — but every TypeScript-level
 * type in the app uses "basic", mapped at the one boundary in map-registration-to-business.ts).
 */
export type BusinessPlanId = "basic" | "plus" | "premium";

export const BUSINESS_PLAN_IDS: BusinessPlanId[] = ["basic", "plus", "premium"];

export function isBusinessPlanId(value: unknown): value is BusinessPlanId {
  return typeof value === "string" && (BUSINESS_PLAN_IDS as string[]).includes(value);
}

/**
 * What the business's subscription is currently doing — informational only. It never gates
 * display by itself; `activePlanId` on the business is the only thing that does that (see
 * getBusinessListingAccess). "pending" specifically means: the owner chose a paid plan
 * (selectedPlanId !== "basic") but no subscription/trial has been started or admin-granted yet.
 */
export type BusinessSubscriptionStatusSummary = "none" | "pending" | "trialing" | "active" | "past-due" | "expired" | "canceled";

/**
 * The business's admin-approval / public-visibility lifecycle, expressed in the plan-state
 * vocabulary the spec asks for. This is a presentational view derived from the registration's
 * existing `status` field (see business-status.ts's BusinessPublicationStatus) — it does not
 * replace that type, which remains the actual source of truth for archive/profile gating.
 */
export type BusinessPlanPublicationStatus = "pending" | "published" | "rejected" | "suspended";

/**
 * The full plan state for one business — the shape every admin UI and the access-gating domain
 * function should read, rather than each re-deriving these four facts separately from raw rows.
 *
 * selectedPlanId — what the owner chose on the registration form. Never overwritten by anything
 *   downstream (spec: "אין לדרוס הרשמת Plus ל-Basic").
 * activePlanId — what's actually live on the site right now (gates the card + profile). Starts at
 *   "basic" even for a selectedPlanId of "plus"/"premium" until a trial/subscription starts or an
 *   admin explicitly activates it.
 * subscriptionStatus — informational summary of the underlying subscription, if any.
 * publicationStatus — the admin-approval lifecycle, in this vocabulary.
 */
export type BusinessPlanState = {
  selectedPlanId: BusinessPlanId;
  activePlanId: BusinessPlanId;
  subscriptionStatus: BusinessSubscriptionStatusSummary;
  publicationStatus: BusinessPlanPublicationStatus;
};
