import "server-only";
import {
  PaymentProviderError,
  type ChargeInput,
  type PaymentMode,
  type PaymentProvider,
  type PaymentResult,
  type SavePaymentMethodInput,
  type SavedPaymentMethod,
  type UnconfirmedReason,
} from "@/domain/payments/payment-provider";
import { chargeSumitCustomer, createSumitCustomer, getSumitPayment, getSumitPaymentMethod, removeSumitPaymentMethod, setSumitPaymentMethod, type SumitPayment } from "./client";
import { getSumitConfig } from "./config";

/** A sanity ceiling against a bug producing a huge charge (2,000 ILS, well above the highest plan price). */
export const MAX_CHARGE_AGOROT = 200_000;

/**
 * The status is derived from the evidence, never from the current configuration, and there is no "failed":
 *   reported not valid                                         -> "unconfirmed" (reason reported-not-valid: ValidPayment=false is not documented to mean nothing was captured)
 *   valid + authorise-only request                             -> "authorised"
 *   valid + read-back (mode unknown)                           -> "unconfirmed" (reason read-back)
 *   valid + capture request + amount NOT proven                -> "unconfirmed" (reason amount-rules-unverified, e.g. VAT not included)
 *   valid + capture request + amount proven (VAT-included, exact) -> "succeeded" (the only status that may become revenue)
 * Every "unconfirmed" result requires reconciliation and is never retried automatically.
 */
function toPaymentResult(payment: SumitPayment, extra: { mode: PaymentMode; amountProven: boolean; documentUrl: string | null }): PaymentResult {
  let status: PaymentResult["status"];
  let unconfirmedReason: UnconfirmedReason | null = null;
  if (!payment.valid) {
    status = "unconfirmed";
    unconfirmedReason = "reported-not-valid";
  } else if (extra.mode === "authorise-only") {
    status = "authorised";
  } else if (extra.mode === "unknown") {
    status = "unconfirmed";
    unconfirmedReason = "read-back";
  } else if (!extra.amountProven) {
    status = "unconfirmed";
    unconfirmedReason = "amount-rules-unverified";
  } else {
    status = "succeeded";
  }
  return {
    paymentId: payment.id,
    customerId: payment.customerId,
    status,
    mode: extra.mode,
    reportedValid: payment.valid,
    unconfirmedReason,
    requiresReconciliation: status === "unconfirmed",
    amountAgorot: payment.amountAgorot,
    occurredAt: payment.date,
    providerStatusText: payment.statusDescription ?? payment.status ?? null,
    documentUrl: extra.documentUrl,
    cardMask: payment.cardMask,
  };
}

/**
 * The SUMIT implementation of the domain PaymentProvider. There is no recurring here - the portal decides WHEN to charge;
 * SUMIT stores the card, charges it and issues the document.
 *
 * charge(): ONLY a Success reply with a readable, consistent payment becomes a result, and even then only a proven capture is
 * "succeeded" (see toPaymentResult / the domain evidence rule); every other readable answer is "unconfirmed" and requires
 * reconciliation. EVERYTHING that is not readable THROWS - network, timeout, TechnicalError, an unreadable or inconsistent reply, and also a BusinessError:
 * SUMIT's documentation does not say that a BusinessError proves nothing was charged (only "Success / BusinessError /
 * TechnicalError"), so it is never classified as a certain refusal. The caller reconciles (getPayment / the provider's list)
 * before any retry; there is no automatic retry.
 */
export function createSumitPaymentProvider(): PaymentProvider {
  return {
    id: "sumit",
    get dryRun() {
      return getSumitConfig()?.dryRun ?? true;
    },

    async savePaymentMethod(input: SavePaymentMethodInput): Promise<SavedPaymentMethod> {
      const { customerId } = await createSumitCustomer({ externalId: input.externalCustomerId, name: input.customer.name, email: input.customer.email, phone: input.customer.phone });
      const saved = await setSumitPaymentMethod({ customerId, singleUseToken: input.paymentToken });
      return { customerId: saved.customerId, paymentMethodId: saved.paymentMethod.id, cardMask: saved.paymentMethod.cardMask };
    },

    async getPaymentMethod(customerId) {
      const method = await getSumitPaymentMethod(customerId);
      return method ? { customerId, paymentMethodId: method.id, cardMask: method.cardMask } : null;
    },

    async removePaymentMethod(customerId) {
      await removeSumitPaymentMethod(customerId);
    },

    async charge(input: ChargeInput): Promise<PaymentResult> {
      if (!Number.isInteger(input.amountAgorot) || input.amountAgorot <= 0 || input.amountAgorot > MAX_CHARGE_AGOROT) {
        throw new PaymentProviderError("invalid-input", "charge amount is out of range");
      }
      if (!input.uniqueKey.trim()) throw new PaymentProviderError("invalid-input", "a charge needs an idempotency key");
      const { payment, documentUrl, authoriseOnly, amountProven } = await chargeSumitCustomer({
        customerId: input.customerId,
        amountAgorot: input.amountAgorot,
        description: input.description,
        documentDescription: `${input.description} (${input.uniqueKey})`,
        vatIncluded: input.vatIncluded,
        sendDocumentByEmail: input.sendDocumentByEmail ?? false,
      });
      return toPaymentResult(payment, { mode: authoriseOnly ? "authorise-only" : "capture", amountProven, documentUrl });
    },

    async getPayment(paymentId) {
      // A read-back: SUMIT documents no field that separates a captured charge from an authorise-only one, and the configuration may
      // have changed since the payment was made - so the mode is "unknown" and a valid payment is only "unconfirmed", never "succeeded".
      return toPaymentResult(await getSumitPayment(paymentId), { mode: "unknown", amountProven: false, documentUrl: null });
    },
  };
}
