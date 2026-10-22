import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { PaymentProviderError, type PaymentProvider } from "@/domain/payments/payment-provider";
import { getPaymentProvider } from "@/lib/payments/get-payment-provider";
import { getSumitConfig } from "@/lib/sumit/config";
import { isSumitRegistrationEmailAllowed } from "@/lib/sumit/registration-access";
import { isPlausibleSumitToken } from "@/lib/sumit/token-shape";
import { buildSubscriptionPlan } from "@/lib/payme/build-subscription-plan";

/**
 * Step 6 of the registration, SUMIT flavour - SAVE A PAYMENT METHOD ONLY. Nothing is charged, no subscription is created,
 * the business stays "pending" and unpublished. (Called by saveSumitPaymentMethodForRegistrationAction, which is limited to SUMIT_TEST_EMAILS on the test
 * organization - see lib/sumit/registration-access.ts.)
 *
 * The browser (later, via payments.js) hands us the SingleUseToken. We:
 *   1) check the owner's own registration is still pending, has no subscription and a billable plan (same rules as PayMe's step 6);
 *   2) provider.savePaymentMethod: create-or-find the SUMIT customer (by our registration id) and attach the card from the token;
 *   3) keep ONLY: the SUMIT customer id, the payment-method id when SUMIT gives one, and the masked card.
 *
 * What is NEVER stored, returned or logged: the card number, CVV, expiry, citizen id, the SingleUseToken (used once, here, and
 * dropped) and SUMIT's permanent CreditCard_Token. The saved row has NO PayMe-style token (provider_token stays null; the
 * database refuses a SUMIT row that has one). The card itself lives at SUMIT; later charges use the customer id.
 *
 * This module has no console calls on purpose: the token passes through it.
 */

export type SaveSumitPaymentMethodInput = {
  registrationId: string;
  ownerId: string;
  /** The signed-in registrant's email - decides who may use SUMIT while the dry run is on (SUMIT_TEST_EMAILS). */
  registrantEmail: string | null | undefined;
  payer: { name: string; email?: string | null; phone?: string | null };
  /** The one-time token from payments.js. Used once and never persisted. */
  singleUseToken: string;
};

export type SaveSumitPaymentMethodResult =
  | { success: true }
  | { success: false; reason: "sumit-not-configured" | "invalid-input" | "not-eligible" | "already-exists" | "invalid-plan" | "rejected" | "provider-error" | "unknown-error" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUSTOMER_ID_PATTERN = /^[0-9]{1,15}$/;

/** The database client the service writes through. Injectable so a test or the local lab can hand it a fake - the lab never touches the real one. */
export type RegistrationAdminClient = Pick<ReturnType<typeof createAdminSupabaseClient>, "from">;

function resolveProvider(registrantEmail: string | null | undefined, injected?: PaymentProvider | null): PaymentProvider | null {
  const config = getSumitConfig();
  // The SUMIT card step is an EXPERIMENT: only the approved TEST organization and only the listed test emails - whatever SUMIT_DRY_RUN says.
  if (!config || !isSumitRegistrationEmailAllowed(config, registrantEmail)) return null;
  if (injected) return injected;
  try {
    return getPaymentProvider();
  } catch {
    // PAYMENTS_PROVIDER is unset / not "sumit" / misconfigured (a PaymentsConfigurationError): this flow stays off. It never guesses or falls back to another provider.
    return null;
  }
}

export async function saveSumitPaymentMethodForRegistration(input: SaveSumitPaymentMethodInput, deps: { provider?: PaymentProvider; admin?: RegistrationAdminClient } = {}): Promise<SaveSumitPaymentMethodResult> {
  const provider = resolveProvider(input.registrantEmail, deps.provider);
  if (!provider || (!deps.admin && !isSupabaseAdminConfigured())) return { success: false, reason: "sumit-not-configured" };

  const payerName = input.payer.name.trim();
  if (!UUID_PATTERN.test(input.registrationId) || !input.ownerId || !payerName || payerName.length > 120 || !isPlausibleSumitToken(input.singleUseToken)) {
    return { success: false, reason: "invalid-input" };
  }

  const admin = deps.admin ?? createAdminSupabaseClient();
  const { data: registration } = await admin
    .from("business_registrations")
    .select("id, status, plan_tier, selected_billing_interval, offer_code")
    .eq("id", input.registrationId)
    .eq("owner_id", input.ownerId)
    .maybeSingle();
  // The owner's own registration, still waiting for the admin.
  if (!registration || registration.status !== "pending") return { success: false, reason: "not-eligible" };

  const { data: existing, error: existingError } = await admin.from("business_subscriptions").select("id").eq("business_registration_id", input.registrationId).maybeSingle();
  if (existingError) return { success: false, reason: "unknown-error" };
  if (existing) return { success: false, reason: "already-exists" };

  // A plan that could never be billed (free tier, unknown track or offer) must not collect a card.
  if (!buildSubscriptionPlan(registration, new Date()).ok) return { success: false, reason: "invalid-plan" };

  let saved;
  try {
    saved = await provider.savePaymentMethod({
      externalCustomerId: input.registrationId,
      customer: { name: payerName, email: input.payer.email?.trim() || null, phone: input.payer.phone?.trim() || null },
      paymentToken: input.singleUseToken,
    });
  } catch (error) {
    return { success: false, reason: error instanceof PaymentProviderError && error.kind === "rejected" ? "rejected" : error instanceof PaymentProviderError && error.kind === "invalid-input" ? "invalid-input" : "provider-error" };
  }

  // The customer id is mandatory: without it nothing could ever be charged, and the database refuses a SUMIT row without one.
  if (!CUSTOMER_ID_PATTERN.test(saved.customerId)) return { success: false, reason: "provider-error" };
  const paymentMethodId = saved.paymentMethodId && CUSTOMER_ID_PATTERN.test(saved.paymentMethodId) ? saved.paymentMethodId : null;

  const { error } = await admin.from("billing_payment_methods").upsert(
    {
      business_registration_id: input.registrationId,
      owner_id: input.ownerId,
      provider: "sumit",
      provider_token: null,
      provider_customer_id: saved.customerId,
      provider_payment_method_id: paymentMethodId,
      card_mask: saved.cardMask,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_registration_id" },
  );
  if (error) {
    // The card is saved at SUMIT but not recorded here: remove it again (best effort) so nothing is left unreferenced.
    await provider.removePaymentMethod(saved.customerId).catch(() => undefined);
    return { success: false, reason: "unknown-error" };
  }

  await admin.from("business_events_log").insert({ business_registration_id: input.registrationId, event_type: "payment_method_added", actor_id: input.ownerId, metadata: { provider: "sumit", stage: "registration" } });
  return { success: true };
}

export type CardSavedStatus = { status: "saved" } | { status: "not-saved" } | { status: "error" };

/**
 * READ ONLY: has a card already been saved for THIS owner's registration? Used when the owner comes back to step 6 (a reload, the
 * wizard restored from the session, a save that finished on the server after the page was left) so the form is not shown again as
 * if nothing had happened. It reads the single row of the registration (any provider) and returns only whether it exists - never
 * the token, the customer id or the mask. It creates, changes and sends nothing.
 */
export async function getCardSavedStatusForRegistration(input: { registrationId: string; ownerId: string }, deps: { admin?: RegistrationAdminClient } = {}): Promise<CardSavedStatus> {
  if (!UUID_PATTERN.test(input.registrationId) || !input.ownerId) return { status: "error" };
  if (!deps.admin && !isSupabaseAdminConfigured()) return { status: "error" };
  const admin = deps.admin ?? createAdminSupabaseClient();
  const { data, error } = await admin.from("billing_payment_methods").select("id").eq("business_registration_id", input.registrationId).eq("owner_id", input.ownerId).maybeSingle();
  if (error) return { status: "error" };
  return data ? { status: "saved" } : { status: "not-saved" };
}
