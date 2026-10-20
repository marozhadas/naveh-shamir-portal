import "server-only";
import { parsePaymentsProvider } from "@/lib/payments/get-payment-provider";

/**
 * PayMe is DORMANT (decided 2026-10-20): SUMIT + UPAY is the only payment provider.
 *
 * PayMe may act only when the payment-provider selection (PAYMENTS_PROVIDER) says PayMe. The selection can only ever say
 * "sumit" (or throw a PaymentsConfigurationError), so this is always false - for every combination of environment
 * variables, including a complete PAYME_* configuration. That is on purpose: leftover PAYME_* variables, an old
 * "sandbox" switch or a typo can never bring PayMe back as a fallback.
 *
 * Every PayMe entry point goes through getPayMeConfig() (lib/payme/config.ts), which asks this first, so the registration
 * step 6, payment resume, trial page, payment actions, approval/activation, rejection/cancel, admin PayMe actions, the
 * webhook and the PayMe client are all switched off by this single check. The code stays only for rollback/debug and for the
 * cleanup in docs/payme-cleanup.md.
 */
export function isPayMeProviderActive(): boolean {
  try {
    return (parsePaymentsProvider(process.env.PAYMENTS_PROVIDER) as string) === "payme";
  } catch {
    // unset / unknown / "payme" (which the selector refuses): not active
    return false;
  }
}
