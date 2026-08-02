export type TrialEligibility = {
  eligible: boolean;
  reason:
    | "eligible"
    | "not-authenticated"
    | "business-not-found"
    | "business-not-owned"
    | "business-not-approved"
    | "trial-already-used"
    | "active-subscription"
    | "subscription-not-eligible";
};
