import "server-only";
import {
  PaymentProviderError,
  type ChargeInput,
  type PaymentProvider,
  type PaymentResult,
  type SavePaymentMethodInput,
  type SavedPaymentMethod,
} from "@/domain/payments/payment-provider";
import { chargeSumitCustomer, createSumitCustomer, getSumitPayment, getSumitPaymentMethod, removeSumitPaymentMethod, setSumitPaymentMethod, type SumitPayment } from "./client";
import { getSumitConfig } from "./config";

/** A sanity ceiling against a bug producing a huge charge (2,000 ILS, well above the highest plan price). */
export const MAX_CHARGE_AGOROT = 200_000;

function toPaymentResult(payment: SumitPayment, extra: { authoriseOnly: boolean; documentUrl: string | null }): PaymentResult {
  const status = !payment.valid ? "failed" : extra.authoriseOnly ? "authorised" : "succeeded";
  return {
    paymentId: payment.id,
    customerId: payment.customerId,
    status,
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
 * charge(): SUMIT answering "no" (a BusinessError envelope, or a payment that is not valid) is a resolved result with
 * status "failed". Anything that is not a trustworthy answer (network, timeout, technical error, unreadable reply) THROWS,
 * because the charge may have happened - the caller must reconcile (getPayment / the provider's list) before retrying.
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
      try {
        const { payment, documentUrl, dryRun } = await chargeSumitCustomer({
          customerId: input.customerId,
          amountAgorot: input.amountAgorot,
          description: input.description,
          documentDescription: `${input.description} (${input.uniqueKey})`,
          vatIncluded: input.vatIncluded,
          sendDocumentByEmail: input.sendDocumentByEmail ?? false,
        });
        return toPaymentResult(payment, { authoriseOnly: dryRun, documentUrl });
      } catch (error) {
        // A definite "no" from SUMIT: nothing was charged. It still has no payment id of its own.
        if (error instanceof PaymentProviderError && error.kind === "rejected") {
          return { paymentId: "", customerId: input.customerId, status: "failed", amountAgorot: input.amountAgorot, occurredAt: null, failureReason: error.detail, documentUrl: null, cardMask: null };
        }
        throw error;
      }
    },

    async getPayment(paymentId) {
      const payment = await getSumitPayment(paymentId);
      // The provider cannot tell a read-back whether the original request was authorise-only; dry-run payments are never read back as revenue.
      return payment ? toPaymentResult(payment, { authoriseOnly: false, documentUrl: null }) : null;
    },
  };
}
