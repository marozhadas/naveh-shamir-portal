import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { toRegistrationId } from "@/utils/business-id";
import { getPayMeConfig, type PayMeConfig, type PayMeEnvironment } from "./config";

/**
 * Who may START a PayMe flow (show Hosted Fields, tokenize → subscription).
 *
 *  - PAYME_ENV=live    → every eligible business, exactly as before: the test switch never blocks real billing.
 *  - PAYME_ENV=sandbox → ONLY a business an admin explicitly switched on (business_registrations.billing_test_enabled),
 *                        so a real owner can never meet a test payment form in production.
 *  - not configured    → nobody (the card-less trial keeps working).
 *
 * The flag is read here, on the server, from the database — never from a URL, form field or anything the client
 * sends — and it is enforced where the flow actually starts (the service functions and the server action), not only
 * where the UI is drawn. Any doubt (no admin access, query error, missing row) fails CLOSED in sandbox.
 */

export type BillingFlowDecision = { allowed: true } | { allowed: false; reason: "not-configured" | "sandbox-not-enabled" };

/** Pure rule — `env` is null when PayMe is not configured at all. */
export function decideBillingFlowAccess(env: PayMeEnvironment | null, billingTestEnabled: boolean): BillingFlowDecision {
  if (env === null) return { allowed: false, reason: "not-configured" };
  if (env === "live") return { allowed: true };
  return billingTestEnabled ? { allowed: true } : { allowed: false, reason: "sandbox-not-enabled" };
}

async function readBillingTestFlag(businessId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const { data, error } = await createAdminSupabaseClient().from("business_registrations").select("billing_test_enabled").eq("id", toRegistrationId(businessId)).maybeSingle();
  if (error || !data) return false;
  return data.billing_test_enabled === true;
}

/**
 * The PayMe configuration this business may use right now, or null. Customer-facing flows (trial page, "המנוי שלי",
 * activate-trial action, trial start in the service layer) must go through this instead of getPayMeConfig().
 */
export async function getPayMeConfigForBusiness(businessId: string): Promise<PayMeConfig | null> {
  const config = getPayMeConfig();
  if (!config) return null;
  // Live never needs the lookup; sandbox always does.
  const flag = config.env === "live" ? false : await readBillingTestFlag(businessId);
  return decideBillingFlowAccess(config.env, flag).allowed ? config : null;
}

/**
 * Who may see/complete the PAYMENT STEP OF REGISTRATION (step 6 of the Plus/Premium wizard). The business does not exist yet
 * when the step is drawn, so the per-business billing_test_enabled switch cannot apply; instead:
 *
 *  - PAYME_ENV=live    -> every registrant;
 *  - PAYME_ENV=sandbox -> only an owner whose sign-in email is on PAYME_SANDBOX_TEST_EMAILS (comma separated, server-only,
 *                         case-insensitive), so a real owner can never meet a test payment form;
 *  - not configured    -> nobody (registration then ends at step 5 exactly as before).
 *
 * The email is the one of the verified Supabase session, read on the server - never anything the browser sends.
 */
export function parseSandboxTestEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 3 && entry.includes("@"));
}

export function decideRegistrationPaymentAccess(env: PayMeEnvironment | null, email: string | null | undefined, sandboxTestEmails: string[]): BillingFlowDecision {
  if (env === null) return { allowed: false, reason: "not-configured" };
  if (env === "live") return { allowed: true };
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized && sandboxTestEmails.includes(normalized) ? { allowed: true } : { allowed: false, reason: "sandbox-not-enabled" };
}

export async function getPayMeConfigForRegistrant(email: string | null | undefined): Promise<PayMeConfig | null> {
  const config = getPayMeConfig();
  if (!config) return null;
  return decideRegistrationPaymentAccess(config.env, email, parseSandboxTestEmails(process.env.PAYME_SANDBOX_TEST_EMAILS)).allowed ? config : null;
}
