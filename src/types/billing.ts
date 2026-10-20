export type BillingProvider = "payme" | "sumit";

/**
 * Mirrors public.billing_payment_methods (service-role only - never card data). Two shapes, enforced by the database
 * (billing_payment_methods_provider_shape_check):
 *   payme: provider_token is PayMe's buyer_key; provider_customer_id / provider_payment_method_id are null
 *   sumit: provider_token is ALWAYS null; provider_customer_id is the SUMIT CustomerID (the card itself lives at SUMIT)
 */
export type BillingPaymentMethodRow = {
  id: string;
  business_registration_id: string;
  owner_id: string;
  provider: BillingProvider;
  /** PayMe's reusable buyer token (buyer_key); null for every non-PayMe row. Server-only; never logged, exported or sent to a browser. */
  provider_token: string | null;
  /** SUMIT CustomerID (digits). Null for PayMe rows. Not a secret and not card data. */
  provider_customer_id: string | null;
  /** SUMIT's id of the saved payment method, when it reports one. Null for PayMe rows. */
  provider_payment_method_id: string | null;
  /** Masked card (e.g. "458045******4580") as returned by PayMe — the only card detail kept. */
  card_mask: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingEventStatus = "received" | "processed" | "failed" | "ignored";

/** Mirrors public.billing_events — one row per provider callback (idempotent on provider + provider_event_id). */
export type BillingEventRow = {
  id: string;
  provider: BillingProvider;
  provider_event_id: string;
  event_type: string;
  business_registration_id: string | null;
  subscription_id: string | null;
  provider_subscription_id: string | null;
  status: BillingEventStatus;
  error: string | null;
  /** Non-sensitive fields only. */
  summary: Record<string, unknown>;
  received_at: string;
  processed_at: string | null;
};

export type BillingTransactionKind = "charge" | "renewal" | "failed" | "refund";
export type BillingTransactionStatus = "succeeded" | "failed" | "pending" | "refunded";

/** Mirrors public.billing_transactions — money PayMe confirmed (or a failed attempt), the source for revenue reporting. */
export type BillingTransactionRow = {
  id: string;
  provider: BillingProvider;
  provider_transaction_id: string;
  business_registration_id: string | null;
  business_name: string | null;
  subscription_id: string | null;
  kind: BillingTransactionKind;
  status: BillingTransactionStatus;
  /** Always agorot (1/100 ₪), the unit PayMe itself uses. */
  amount_agorot: number;
  currency: string;
  plan_id: string | null;
  billing_interval: "monthly" | "yearly" | null;
  offer_code: string | null;
  occurred_at: string;
  failure_reason: string | null;
  provider_status: string | null;
  /** The provider's own payment id (SUMIT Payment.ID) once a charge answered; provider_transaction_id stays OUR idempotency key. Null for PayMe rows. */
  provider_payment_id: string | null;
  created_at: string;
};
