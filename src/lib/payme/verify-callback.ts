import { constantTimeEquals, type ParsedPayMeCallback } from "./payme-helpers";

/**
 * Callback authenticity, the model PayMe confirmed for Seller accounts: subscription callbacks carry NO signature
 * (no HMAC) and there is no endpoint to read a subscription back. So a callback is trusted only when ALL of these hold:
 *
 *   1. its URL carried our private PAYME_WEBHOOK_SECRET        (checked by the route, before anything is read)
 *   2. it names a subscription that WE stored (sub_payme_id)   (the caller looks the row up by that exact id)
 *   3. its seller_payme_id is our PAYME_SELLER_ID
 *   4. its sub_payme_id equals, exactly, the PayMe id stored on that row
 *   5. if it echoes our own subscription_id (the business registration id we passed at creation), it is that row's
 *
 * Pure, no I/O. A callback that fails any step must not change anything and must be recorded as failed.
 * Nothing the callback says about money (amounts, dates, status) is used for trust — see decideSubscriptionTransition.
 */

export type CallbackVerificationFailure = "unknown-subscription" | "seller-id-missing" | "seller-mismatch" | "subscription-id-mismatch" | "merchant-id-mismatch";

export type CallbackVerification = { ok: true } | { ok: false; reason: CallbackVerificationFailure };

export type LocalSubscriptionIdentity = {
  /** The PayMe subscription id stored on our row (business_subscriptions.provider_subscription_id). */
  providerSubscriptionId: string | null;
  /** Our own id for the subscription — the business registration it belongs to. */
  businessRegistrationId: string;
};

export function verifyCallbackAgainstLocal(input: { callback: ParsedPayMeCallback; configuredSellerId: string; local: LocalSubscriptionIdentity | null }): CallbackVerification {
  const { callback, configuredSellerId, local } = input;

  if (!local || !local.providerSubscriptionId || !callback.subPaymeId) return { ok: false, reason: "unknown-subscription" };

  const sellerId = callback.fields.seller_payme_id;
  if (!sellerId) return { ok: false, reason: "seller-id-missing" };
  if (!configuredSellerId || !constantTimeEquals(sellerId, configuredSellerId)) return { ok: false, reason: "seller-mismatch" };

  if (!constantTimeEquals(callback.subPaymeId, local.providerSubscriptionId)) return { ok: false, reason: "subscription-id-mismatch" };

  if (callback.merchantSubscriptionId && callback.merchantSubscriptionId !== local.businessRegistrationId) return { ok: false, reason: "merchant-id-mismatch" };

  return { ok: true };
}
