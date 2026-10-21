import "server-only";
import {
  PaymentProviderError,
  type ChargeInput,
  type PaymentMode,
  type PaymentProvider,
  type PaymentResult,
  type SavePaymentMethodInput,
  type SavedPaymentMethod,
} from "@/domain/payments/payment-provider";
import { chargeSumitCustomer, createSumitCustomer, getSumitPayment, getSumitPaymentMethod, removeSumitPaymentMethod, setSumitPaymentMethod, type SumitPayment } from "./client";
import { getSumitConfig } from "./config";

/** A sanity ceiling against a bug producing a huge charge (2,000 ILS, well above the highest plan price). */
export const MAX_CHARGE_AGOROT = 200_000;

/**
 * The status is derived from the evidence, never from the current configuration:
 *   invalid payment                      -> "failed"      (SUMIT returned a readable payment that is explicitly not valid)
 *   valid + THIS request was a capture   -> "succeeded"   (the only status that may become revenue)
 *   valid + THIS request was authorise   -> "authorised"
 *   valid + unknown origin (read-back)   -> "unconfirmed" (cannot tell a capture from an authorise-only; not revenue)
 */
function toPaymentResult(payment: SumitPayment, extra: { mode: PaymentMode; documentUrl: string | null }): PaymentResult {
  const status = !payment.valid ? "failed" : extra.mode === "capture" ? "succeeded" : extra.mode === "authorise-only" ? "authorised" : "unconfirmed";
  return {
    paymentId: payment.id,
    customerId: payment.customerId,
    status,
    mode: extra.mode,
    amountAgorot: payment.amountAgorot,
    occurredAt: payment.date,
    failureReason: status === "failed" ? (payment.statusDescription ?? payment.status ?? null) : null,
    documentUrl: extra.documentUrl,
    cardMask: payment.cardMask,
  };
}

/**
 * The SUMIT implementation of the domain PaymentProvider. There is no recurring here - the portal decides WHEN to charge;
 * SUMIT stores the card, charges it and issues the document.
 *
 * charge(): ONLY a Success reply with a readable, consistent payment becomes a result (see toPaymentResult / the domain evidence
 * rule). EVERYTHING else THROWS - network, timeout, TechnicalError, an unreadable or inconsistent reply, and also a BusinessError:
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
      const { payment, documentUrl, authoriseOnly } = await chargeSumitCustomer({
        customerId: input.customerId,
        amountAgorot: input.amountAgorot,
        description: input.description,
        documentDescription: `${input.description} (${input.uniqueKey})`,
        vatIncluded: input.vatIncluded,
        sendDocumentByEmail: input.sendDocumentByEmail ?? false,
      });
      return toPaymentResult(payment, { mode: authoriseOnly ? "authorise-only" : "capture", documentUrl });
    },

    async getPayment(paymentId) {
      // A read-back: SUMIT documents no field that separates a captured charge from an authorise-only one, and the configuration may
      // have changed since the payment was made - so the mode is "unknown" and a valid payment is only "unconfirmed", never "succeeded".
      return toPaymentResult(await getSumitPayment(paymentId), { mode: "unknown", documentUrl: null });
    },
  };
}
