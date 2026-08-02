export type BusinessListingTier = "basic" | "premium";

export type BusinessListingAccessReason =
  | "basic-listing"
  | "trial-active"
  | "subscription-active"
  | "subscription-expired"
  | "subscription-past-due"
  | "business-not-approved"
  | "business-suspended";

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
  tier: BusinessListingTier;
  reason: BusinessListingAccessReason;
};
