import type { PayMeEnvironment } from "@/lib/payme/config";

export type ApprovalPath =
  /** A saved card exists and PayMe is configured: approving IS the activation (subscription + trial + approve + publish). */
  | "activate"
  /** Nothing to activate (free plan, or PayMe not live and no card): the legacy approval - status only; the trial starts later. */
  | "approve-only"
  /** PayMe is live and a paid business has no saved card: approving would publish an unbilled business. */
  | "blocked-no-payment-method"
  /** A card was saved but PayMe is no longer configured: the subscription cannot be created. */
  | "blocked-payme-not-configured";

/**
 * Pure rule for what an admin's "approve" does for a PENDING registration. The only input that changes it is whether the
 * owner saved a card in registration step 6 - decided from the database, never from the browser.
 */
export function decideApprovalPath(params: { planTier: string; hasPaymentMethod: boolean; paymeEnv: PayMeEnvironment | null }): ApprovalPath {
  const { planTier, hasPaymentMethod, paymeEnv } = params;
  if (planTier !== "plus" && planTier !== "premium") return "approve-only";
  if (hasPaymentMethod) return paymeEnv === null ? "blocked-payme-not-configured" : "activate";
  return paymeEnv === "live" ? "blocked-no-payment-method" : "approve-only";
}
