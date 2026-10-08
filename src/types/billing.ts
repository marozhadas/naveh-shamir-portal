export type BillingProvider = "payme";

/** Mirrors public.billing_payment_methods (service-role only — holds PayMe's opaque token, never card data). */
export type BillingPaymentMethodRow = {
  id: string;
  business_registration_id: string;
  owner_id: string;
  provider: BillingProvider;
  /** PayMe's reusable buyer token (buyer_key). Server-only; never logged, exported or sent to a browser. */
  provider_token: string;
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
  created_at: string;
};
