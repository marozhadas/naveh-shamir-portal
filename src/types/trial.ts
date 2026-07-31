export type TrialEligibility = {
  eligible: boolean;
  reason: "eligible" | "trial-already-used" | "active-subscription" | "business-not-owned" | "not-authenticated";
};
