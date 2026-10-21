import "server-only";
import type { PaymentProvider } from "@/domain/payments/payment-provider";
import { createSumitPaymentProvider } from "@/lib/sumit/sumit-payment-provider";
import { getSumitConfigurationProblems } from "@/lib/sumit/config";

/**
 * A clear configuration error: the payment provider the environment asks for cannot be used. It names variables only
 * (never values). It is thrown instead of ever guessing or falling back to another provider - a misconfigured switch must
 * stop, not silently charge through the wrong provider.
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
 * PAYMENTS_PROVIDER - SUMIT (with its UPAY terminal) is the ONLY payment provider the app selects:
 *   "sumit"               -> "sumit"
 *   unset / blank         -> PaymentsConfigurationError. No provider is guessed.
 *   "payme"               -> PaymentsConfigurationError. PayMe is legacy / dormant code: it is never selected by this switch.
 *   anything else         -> PaymentsConfigurationError (a typo never selects a provider)
 * Case and surrounding spaces are ignored. Whether SUMIT is actually configured is checked by getPaymentProvider().
 *
 * (The legacy PayMe code under src/lib/payme still has its own PAYME_* configuration and is still wired into the existing
 * registration/approval screens until the cleanup in docs/payme-cleanup.md - this switch does not turn it on or off.)
 */
export function parsePaymentsProvider(value: string | undefined): "sumit" {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "sumit") return "sumit";
  if (normalized === "") throw new PaymentsConfigurationError('PAYMENTS_PROVIDER is not set (expected "sumit")', ["PAYMENTS_PROVIDER"]);
  if (normalized === "payme") throw new PaymentsConfigurationError('PAYMENTS_PROVIDER="payme" is not supported: PayMe is legacy/dormant and is never selected (expected "sumit")', ["PAYMENTS_PROVIDER"]);
  throw new PaymentsConfigurationError('PAYMENTS_PROVIDER has an unknown value (expected "sumit")', ["PAYMENTS_PROVIDER"]);
}

export function getPaymentsProviderId(): "sumit" {
  return parsePaymentsProvider(process.env.PAYMENTS_PROVIDER);
}

/**
 * The provider the business code uses through the domain interface. Always SUMIT, or a PaymentsConfigurationError:
 *   - PAYMENTS_PROVIDER unset / "payme" / unknown: PaymentsConfigurationError (no guessing, no PayMe fallback);
 *   - "sumit" with anything missing / invalid in the SUMIT configuration - including an environment that is not the approved one
 *     (SUMIT_ENVIRONMENT / SUMIT_TEST_COMPANY_ID / SUMIT_ALLOW_PRODUCTION): PaymentsConfigurationError naming the variables and
 *     their problem (never a value);
 *   - "sumit" with a fully valid configuration: the SUMIT provider.
 */
export function getPaymentProvider(): PaymentProvider {
  getPaymentsProviderId();
  const problems = getSumitConfigurationProblems();
  if (problems.length > 0) {
    throw new PaymentsConfigurationError(
      `PAYMENTS_PROVIDER=sumit but the SUMIT configuration is not usable (${problems.map((entry) => `${entry.variable}: ${entry.problem}`).join("; ")})`,
      [...new Set(problems.map((entry) => entry.variable))],
    );
  }
  return createSumitPaymentProvider();
}
