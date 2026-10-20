import "server-only";
import type { PaymentProvider, PaymentProviderId } from "@/domain/payments/payment-provider";
import { createSumitPaymentProvider } from "@/lib/sumit/sumit-payment-provider";
import { isSumitConfigured } from "@/lib/sumit/config";

/** PAYMENTS_PROVIDER: "sumit" selects SUMIT; anything else (including unset) keeps PayMe, so nothing changes until it is switched on purpose. */
export function parsePaymentsProvider(value: string | undefined): PaymentProviderId {
  return value?.trim().toLowerCase() === "sumit" ? "sumit" : "payme";
}

export function getPaymentsProviderId(): PaymentProviderId {
  return parsePaymentsProvider(process.env.PAYMENTS_PROVIDER);
}

/**
 * The provider the business code should use through the domain interface - or null when the app is not on the new
 * provider (PAYMENTS_PROVIDER is not "sumit") or SUMIT is not configured. PayMe stays dormant and keeps its own, separate
 * subscription flow (src/lib/payme); it is not wrapped by this interface in this stage.
 */
export function getPaymentProvider(): PaymentProvider | null {
  if (getPaymentsProviderId() !== "sumit") return null;
  if (!isSumitConfigured()) return null;
  return createSumitPaymentProvider();
}
