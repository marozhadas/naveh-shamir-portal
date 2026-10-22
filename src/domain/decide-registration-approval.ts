import type { PayMeEnvironment } from "@/lib/payme/config";

/** Which provider holds the card the owner saved in registration step 6 (read from the database, never from the browser). */
export type SavedPaymentMethodProvider = "payme" | "sumit";

export type ApprovalPath =
  /** A saved PayMe card exists and PayMe is configured: approving IS the activation (subscription + trial + approve + publish). */
  | "activate"
  /** A saved SUMIT card exists: approving starts the TRIAL only (local subscription row, no provider call, no charge) and publishes. */
  | "activate-sumit-trial"
  /** Nothing to activate (free plan, or PayMe not live and no card): the legacy approval - status only; the trial starts later. */
  | "approve-only"
  /** PayMe is live and a paid business has no saved card: approving would publish an unbilled business. */
  | "blocked-no-payment-method"
  /** A PayMe card was saved but PayMe is no longer configured: the subscription cannot be created. */
  | "blocked-payme-not-configured";

/**
 * Pure rule for what an admin's "approve" does for a PENDING registration. The inputs that change it are whether the owner saved a
 * card in registration step 6 and WHICH provider holds it - decided from the database, never from the browser. A SUMIT card needs
 * no PayMe configuration and no stored token: it is identified by provider = "sumit" (and its SUMIT customer id, checked where
 * the row is read).
 *
 * `paymentMethodProvider` defaults to "payme" when a card exists and the caller did not say (the behaviour before SUMIT).
 */
export function decideApprovalPath(params: { planTier: string; hasPaymentMethod: boolean; paymeEnv: PayMeEnvironment | null; paymentMethodProvider?: SavedPaymentMethodProvider | null }): ApprovalPath {
  const { planTier, hasPaymentMethod, paymeEnv } = params;
  if (planTier !== "plus" && planTier !== "premium") return "approve-only";
  if (hasPaymentMethod) {
    if ((params.paymentMethodProvider ?? "payme") === "sumit") return "activate-sumit-trial";
    return paymeEnv === null ? "blocked-payme-not-configured" : "activate";
  }
  return paymeEnv === "live" ? "blocked-no-payment-method" : "approve-only";
}
