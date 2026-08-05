export type BusinessListingTier = "basic" | "plus" | "premium";

export type BusinessListingAccessReason =
  | "basic-listing"
  | "trial-active"
  | "subscription-active"
  | "subscription-expired"
  | "subscription-past-due"
  | "business-not-approved"
  | "business-suspended"
  /** activePlanId is plus/premium but there's no subscription in a recognized "live" state — an admin granted this tier directly (see changeBusinessPlanAction). */
  | "admin-granted";

/**
 * The single source of truth for what a business is allowed to show, computed fresh by
 * getBusinessListingAccess() from the business's approval status plus its subscription/trial
 * state — never stored, never inferred from a lone flag like `verified`, so it can't drift out of
 * sync with the subscription record the way a cached boolean could.
 */
export type BusinessListingAccess = {
  canAppearInArchive: boolean;
  canOpenProfile: boolean;
  canShowVerifiedBadge: boolean;
  canShowFullContactDetails: boolean;
  canShowGallery: boolean;
  canShowServices: boolean;
  canShowOpeningHours: boolean;
  /** Plus explicitly does not get this — self-editing (magic-link login, /business/dashboard/profile) is Premium-only. */
  canSelfEdit: boolean;
  /** Eligibility only — the homepage must still separately check business.featured before actually showing it (admin picks who, not every Premium business automatically). */
  canBeHomepageFeatured: boolean;
  tier: BusinessListingTier;
  reason: BusinessListingAccessReason;
};
