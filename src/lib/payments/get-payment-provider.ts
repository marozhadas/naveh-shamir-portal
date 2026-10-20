import "server-only";
import type { PaymentProvider, PaymentProviderId } from "@/domain/payments/payment-provider";
import { createSumitPaymentProvider } from "@/lib/sumit/sumit-payment-provider";
import { getMissingSumitVariables } from "@/lib/sumit/config";

/**
 * A clear configuration error: the payment provider the environment asks for cannot be used. It names variables only
 * (never values). It is thrown instead of ever falling back to another provider - a misconfigured switch must stop, not
 * silently charge through the wrong provider.
 */
export class PaymentsConfigurationError extends Error {
  constructor(
    message: string,
    /** Names of the variables that are missing / invalid (never their values). */
    readonly variables: string[] = [],
  ) {
    super(message);
    this.name = "PaymentsConfigurationError";
  }
}

/**
 * PAYMENTS_PROVIDER, fail closed:
 *   unset (or blank)      -> "payme"  - the existing behaviour, unchanged
 *   "payme"               -> "payme"
 *   "sumit"               -> "sumit"
 *   anything else         -> PaymentsConfigurationError (a typo never selects a provider)
 * Case and surrounding spaces are ignored. Whether SUMIT is actually configured is checked by getPaymentProvider().
 */
export function parsePaymentsProvider(value: string | undefined): PaymentProviderId {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "") return "payme";
  if (normalized === "payme" || normalized === "sumit") return normalized;
  throw new PaymentsConfigurationError("PAYMENTS_PROVIDER has an unknown value (expected \"payme\" or \"sumit\")", ["PAYMENTS_PROVIDER"]);
}

export function getPaymentsProviderId(): PaymentProviderId {
  return parsePaymentsProvider(process.env.PAYMENTS_PROVIDER);
}

/**
 * The provider the business code uses through the domain interface:
 *   - PAYMENTS_PROVIDER unset / "payme": null - the app keeps PayMe's own, separate subscription flow (src/lib/payme),
 *     which is not wrapped by this interface in this stage;
 *   - "sumit" with every required SUMIT variable present: the SUMIT provider;
 *   - "sumit" with anything missing / invalid: PaymentsConfigurationError. NEVER a silent fallback to PayMe;
 *   - an unknown value: PaymentsConfigurationError.
 */
export function getPaymentProvider(): PaymentProvider | null {
  if (getPaymentsProviderId() === "payme") return null;
  const missing = getMissingSumitVariables();
  if (missing.length > 0) {
    throw new PaymentsConfigurationError(`PAYMENTS_PROVIDER=sumit but the SUMIT configuration is incomplete (${missing.join(", ")})`, missing);
  }
  return createSumitPaymentProvider();
}
