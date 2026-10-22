import "server-only";
import { parsePaymentsProvider } from "@/lib/payments/get-payment-provider";
import { getSumitConfig, type SumitConfig } from "./config";

/**
 * Who may SAVE A CARD in registration step 6 (the SUMIT experiment). Deliberately stricter than the rest of SUMIT:
 *
 *   - the organization must be the approved TEST organization (SUMIT_ENVIRONMENT=test, which getSumitConfig only accepts when
 *     SUMIT_COMPANY_ID equals SUMIT_TEST_COMPANY_ID);
 *   - PAYMENTS_PROVIDER must say "sumit";
 *   - the signed-in owner's email (verified Supabase session, read on the server) must be on SUMIT_TEST_EMAILS.
 *
 * SUMIT_DRY_RUN does NOT matter here: with SUMIT_DRY_RUN=false the experiment is still limited to the test list and to the test
 * organization. Opening step 6 to everyone is a separate, deliberate change of THIS function - nothing else widens it.
 *
 * What may reach the browser: the CompanyID and the PUBLIC key payments.js needs - never the API key.
 */

export type SumitRegistrationPayment = { companyId: number; apiPublicKey: string; testMode: true };

export function isSumitRegistrationEmailAllowed(config: Pick<SumitConfig, "environment" | "testEmails">, email: string | null | undefined): boolean {
  if (config.environment !== "test") return false;
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized.length > 3 && config.testEmails.includes(normalized);
}

export function getSumitRegistrationPayment(email: string | null | undefined): SumitRegistrationPayment | null {
  try {
    if (parsePaymentsProvider(process.env.PAYMENTS_PROVIDER) !== "sumit") return null;
  } catch {
    // unset / unknown / "payme": this flow stays off - it never guesses or falls back to another provider
    return null;
  }
  const config = getSumitConfig();
  if (!config || !isSumitRegistrationEmailAllowed(config, email)) return null;
  return { companyId: config.companyId, apiPublicKey: config.apiPublicKey, testMode: true };
}
