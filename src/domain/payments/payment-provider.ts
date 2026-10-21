/**
 * The payment-provider contract the business code talks to. Pure types - no I/O, no provider names beyond the id, nothing
 * server-only - so a provider (SUMIT today) can be swapped without touching the registration / approval / billing logic.
 *
 * Deliberately NOT here: recurring schedules. The portal owns the billing schedule (next billing date, trial, grace); a
 * provider only stores a payment method, charges it, and reports a payment.
 *
 * Money is always integer agorot (1/100 ILS), like billing_transactions.amount_agorot.
 *
 * EVIDENCE RULE: a result only ever claims what the evidence proves - and there is NO "failed" outcome, because the provider's
 * documentation does not prove "nothing was charged" for any of the signals it gives (an error envelope, ValidPayment=false).
 *   - "succeeded" (money moved)  needs ALL of: THIS request asked for a real charge (mode "capture"), the provider answered Success,
 *     the payment is readable and explicitly valid (reportedValid), its customer agrees with the request, and the amount is PROVEN
 *     (a VAT-included price paid exactly). Nothing read back later (getPayment) can reach "succeeded".
 *   - "authorised"               the request was authorise-only (a dry run) and the provider reports it valid: validated, never charged, never revenue.
 *   - "unconfirmed"              everything else the provider answered readably. NOT proof of a charge and NOT proof of no charge: never revenue
 *     and never a trigger for dunning / retry by itself. requiresReconciliation is true and unconfirmedReason says why:
 *       "read-back"                a getPayment cannot tell a captured charge from an authorise-only one;
 *       "reported-not-valid"       ValidPayment=false is not documented to mean that nothing was captured;
 *       "amount-rules-unverified"  the amount / VAT rules are not verified (e.g. VAT not included), so the amount does not prove the charge.
 *   Anything not readable or not consistent - network failure, timeout, a technical error, an unreadable reply, a BusinessError, a missing
 *   field - is NOT a result: it throws a PaymentProviderError. The outcome is then UNKNOWN.
 *   BOTH an "unconfirmed" result and a thrown error mean: reconcile with getPayment / the provider's list BEFORE anything else.
 *   No automatic retry, ever.
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
  /** Money was charged - proven by the evidence rule above (mode "capture"). The only status that may ever be recognised as revenue. */
  | "succeeded"
  /** Authorise-only (dry run): the card was only validated - nothing was charged and nothing may be booked as revenue. */
  | "authorised"
  /** Readable, but NOT proven either way (see unconfirmedReason). Not revenue, not a failure: it must be reconciled, never retried automatically. */
  | "unconfirmed";

export type UnconfirmedReason = "read-back" | "reported-not-valid" | "amount-rules-unverified";

/** What the request that created the payment asked for - from the request itself, never from the current configuration. */
export type PaymentMode = "capture" | "authorise-only" | "unknown";

export type PaymentResult = {
  paymentId: string;
  customerId: ProviderCustomerId | null;
  status: PaymentStatus;
  /** "capture" / "authorise-only" for the request that produced this result; "unknown" for a read-back. Store it with the attempt. */
  mode: PaymentMode;
  /** The provider's own Payment.ValidPayment flag, as reported. Informational: "false" is not proof that nothing was charged. */
  reportedValid: boolean;
  /** Why the status is "unconfirmed"; null for "succeeded" and "authorised". */
  unconfirmedReason: UnconfirmedReason | null;
  /** True exactly when the status is "unconfirmed": check with getPayment / the provider's list first, and never retry automatically. */
  requiresReconciliation: boolean;
  amountAgorot: number;
  /** ISO time, when the provider reports one. */
  occurredAt: string | null;
  /** The provider's own short status text (Status / StatusDescription), when it gave one. Display / logging only - never a basis for a decision. */
  providerStatusText: string | null;
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
  /**
   * A payment by the provider's id, as a read-back: never "succeeded" (mode "unknown"). Throws when the provider cannot give a
   * readable payment - including "no such payment", which the provider does not document, so absence is never inferred.
   */
  getPayment(paymentId: string): Promise<PaymentResult>;
}
