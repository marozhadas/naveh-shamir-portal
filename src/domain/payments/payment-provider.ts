/**
 * The payment-provider contract the business code talks to. Pure types - no I/O, no provider names beyond the id, nothing
 * server-only - so a provider (SUMIT today) can be swapped without touching the registration / approval / billing logic.
 *
 * Deliberately NOT here: recurring schedules. The portal owns the billing schedule (next billing date, trial, grace); a
 * provider only stores a payment method, charges it, and reports a payment.
 *
 * Money is always integer agorot (1/100 ILS), like billing_transactions.amount_agorot.
 *
 * Outcomes of `charge` (the caller must treat them differently):
 *   - a resolved PaymentResult with status "failed"      -> the provider answered "no": nothing was charged.
 *   - a resolved PaymentResult with status "succeeded"   -> money moved (or, with status "authorised", it was only validated).
 *   - a thrown PaymentProviderError                      -> NO answer we can trust (network, timeout, provider error,
 *     unreadable reply). The charge may or may not have happened, so it must be reconciled with getPayment / the provider's
 *     list BEFORE any retry - never retried blindly.
 */

export type PaymentProviderId = "payme" | "sumit";

export type PaymentProviderErrorKind =
  /** The provider is not configured (missing credentials / switched off). Nothing was sent. */
  | "not-configured"
  /** Our own validation refused the input. Nothing was sent. */
  | "invalid-input"
  /** No answer: network failure or timeout. For a charge the outcome is UNKNOWN. */
  | "network"
  /** The provider reported an error of its own (not a business "no"). For a charge the outcome is UNKNOWN. */
  | "provider-error"
  /** The reply could not be understood. For a charge the outcome is UNKNOWN. */
  | "invalid-response"
  /** The provider refused the request (a business error). For a charge this is reported as a failed PaymentResult instead. */
  | "rejected";

export class PaymentProviderError extends Error {
  constructor(
    readonly kind: PaymentProviderErrorKind,
    message: string,
    /** The provider's own short, redacted explanation (display / failure reason only), when it gave one. */
    readonly detail: string | null = null,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

/** The provider-side customer id (opaque text; SUMIT's CustomerID). */
export type ProviderCustomerId = string;

export type SavePaymentMethodInput = {
  /** Our own stable id for the payer (the business registration id) - lets the provider find the same customer again. */
  externalCustomerId: string;
  customer: { name: string; email?: string | null; phone?: string | null };
  /** The one-time token the browser got from the provider. Used once and never persisted or logged. */
  paymentToken: string;
};

export type SavedPaymentMethod = {
  customerId: ProviderCustomerId;
  /** The provider's id of the saved method, when it reports one. */
  paymentMethodId: string | null;
  /** Masked card only (e.g. "458045******4580"). Never a full number, expiry, CVV or token. */
  cardMask: string | null;
};

export type ChargeInput = {
  customerId: ProviderCustomerId;
  amountAgorot: number;
  /** What the charge is for - printed on the provider's document. */
  description: string;
  /** Our idempotency key for this charge (subscription + period + attempt). Recorded for traceability; uniqueness is enforced by the caller's own store. */
  uniqueKey: string;
  /** Whether amountAgorot already includes VAT. Required on purpose: there is no safe default. */
  vatIncluded: boolean;
  /** Ask the provider to email the document to the customer. */
  sendDocumentByEmail?: boolean;
};

export type PaymentStatus =
  /** Money was charged. */
  | "succeeded"
  /** Dry run: the card was only validated/authorised - nothing was charged and nothing may be booked as revenue. */
  | "authorised"
  | "failed";

export type PaymentResult = {
  paymentId: string;
  customerId: ProviderCustomerId | null;
  status: PaymentStatus;
  amountAgorot: number;
  /** ISO time, when the provider reports one. */
  occurredAt: string | null;
  /** Short plain text for a failed payment (provider's own description). Display only. */
  failureReason: string | null;
  /** https link to the invoice/receipt, when the provider issued one. */
  documentUrl: string | null;
  cardMask: string | null;
};

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** True while charges are only validated, never executed. */
  readonly dryRun: boolean;
  savePaymentMethod(input: SavePaymentMethodInput): Promise<SavedPaymentMethod>;
  /** The saved method of a customer, or null when there is none. */
  getPaymentMethod(customerId: ProviderCustomerId): Promise<SavedPaymentMethod | null>;
  removePaymentMethod(customerId: ProviderCustomerId): Promise<void>;
  charge(input: ChargeInput): Promise<PaymentResult>;
  /** A payment by the provider's id, or null when the provider has no such payment. */
  getPayment(paymentId: string): Promise<PaymentResult | null>;
}
