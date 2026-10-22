import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { mapSubscriptionRowToBusinessSubscription } from "@/utils/map-subscription-row";
import { isValidBusinessSlug } from "@/utils/business-slug";
import { buildSubscriptionPlan } from "@/lib/payme/build-subscription-plan";
import type { BusinessSubscription } from "@/types/subscription";
import type { OfferCode } from "@/data/subscription-offers";

/**
 * The admin's approval of a pending registration whose owner saved a SUMIT card in step 6 starts the TRIAL and publishes the
 * business - and does nothing else:
 *
 *   - NO call to any payment provider (this module does not import one), NO charge, NO SUMIT request of any kind;
 *   - the subscription row is local only: payment_provider = "sumit", provider_subscription_id = NULL (SUMIT has no
 *     subscription object; the portal owns the schedule), status "trialing";
 *   - next_billing_at = the end of the trial (the same moment as trial_ends_at). It is only a planned date: nothing reads it to
 *     charge. Billing is NOT connected (see docs/sumit-verification.md); until it is, the hourly database job simply ends the
 *     trial at trial_ends_at (a row without provider_subscription_id gets no grace window) - nobody is ever charged.
 *
 * Trial policy is the existing one, untouched: the length comes from the offer stored on the business row by the admin
 * (launch_standard = 30 days, pilot_2026 = 90), counted from the approval (buildSubscriptionPlan / computeTrialWindow), and
 * snapshotted on the row. The card is recognised by provider = "sumit" and its SUMIT customer id - never by a token.
 *
 * Concurrency: business_subscriptions has UNIQUE(business_registration_id). Two simultaneous approvals can both pass the checks
 * but only one insert succeeds; the other gets "already-exists" and touches nothing - so there is never a second subscription and
 * the trial is never reset. Approving again later finds the business no longer pending ("not-pending") before anything is written.
 * The registration is flipped to approved with a guard on status = "pending"; if that fails the subscription row WE inserted is
 * removed again - never a half-approved business.
 */

const CUSTOMER_ID_PATTERN = /^[0-9]{1,15}$/;
const UNIQUE_VIOLATION = "23505";

export type ActivateSumitTrialResult =
  | { success: true; subscription: BusinessSubscription; offerCode: OfferCode; trialDays: number; nextBillingAt: string }
  | { success: false; reason: "not-found" | "not-pending" | "no-owner" | "invalid-slug" | "no-payment-method" | "already-exists" | "invalid-plan" | "approve-failed" | "unknown-error" };

/** The database client the activation writes through. Injectable so a test can hand it a fake. */
export type SumitTrialAdminClient = Pick<ReturnType<typeof createAdminSupabaseClient>, "from" | "auth">;

export async function activateSumitTrialOnApproval(registrationId: string, adminId: string, deps: { admin?: SumitTrialAdminClient; now?: () => Date } = {}): Promise<ActivateSumitTrialResult> {
  if (!deps.admin && !isSupabaseAdminConfigured()) return { success: false, reason: "unknown-error" };
  const admin = deps.admin ?? createAdminSupabaseClient();
  const now = deps.now?.() ?? new Date();

  const { data: registration } = await admin
    .from("business_registrations")
    .select("id, status, slug, owner_id, plan_tier, selected_billing_interval, offer_code")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration) return { success: false, reason: "not-found" };
  if (registration.status !== "pending") return { success: false, reason: "not-pending" };

  if (!registration.owner_id) return { success: false, reason: "no-owner" };
  const { data: ownerLookup, error: ownerError } = await admin.auth.admin.getUserById(registration.owner_id);
  if (ownerError || !ownerLookup?.user) return { success: false, reason: "no-owner" };

  if (!isValidBusinessSlug(registration.slug)) return { success: false, reason: "invalid-slug" };

  // The card: a SUMIT row with a SUMIT customer id. The token column is never selected (the database keeps it NULL for SUMIT).
  const { data: method, error: methodError } = await admin.from("billing_payment_methods").select("provider_customer_id").eq("business_registration_id", registrationId).eq("provider", "sumit").maybeSingle();
  if (methodError) return { success: false, reason: "unknown-error" };
  if (!method || typeof method.provider_customer_id !== "string" || !CUSTOMER_ID_PATTERN.test(method.provider_customer_id)) return { success: false, reason: "no-payment-method" };

  const { data: existing, error: existingError } = await admin.from("business_subscriptions").select("id").eq("business_registration_id", registrationId).maybeSingle();
  if (existingError) return { success: false, reason: "unknown-error" };
  if (existing) return { success: false, reason: "already-exists" };

  const built = buildSubscriptionPlan(registration, now);
  if (!built.ok) return { success: false, reason: "invalid-plan" };
  const { plan } = built;
  const nextBillingAt = plan.trialEndsAt;

  const { data: inserted, error: insertError } = await admin
    .from("business_subscriptions")
    .insert({
      business_registration_id: registrationId,
      owner_id: registration.owner_id,
      plan_id: plan.planId,
      status: "trialing",
      trial_started_at: plan.trialStartedAt,
      trial_ends_at: plan.trialEndsAt,
      offer_code: plan.offerCode,
      trial_days: plan.trialDays,
      cancel_at_period_end: false,
      billing_interval: plan.snapshot.billingInterval,
      price_amount_ils: plan.snapshot.amountIls,
      price_version: plan.snapshot.priceVersion,
      is_launch_price: plan.snapshot.isLaunchPrice,
      payment_provider: "sumit",
      provider_subscription_id: null,
      next_billing_at: nextBillingAt,
    })
    .select()
    .single();
  if (insertError || !inserted) {
    // Lost the race (a second approval, a double click): the winner's row stands and is left exactly as it is.
    return { success: false, reason: insertError?.code === UNIQUE_VIOLATION ? "already-exists" : "unknown-error" };
  }

  // Approve and publish - only while the business is still pending. A failure (or a business that is no longer pending) removes the row we just wrote.
  const { data: approved, error: approveError } = await admin
    .from("business_registrations")
    .update({ active_plan_id: plan.planId, status: "approved", reviewed_at: now.toISOString(), rejection_reason: null })
    .eq("id", registrationId)
    .eq("status", "pending")
    .select("id");
  if (approveError || !approved || approved.length !== 1) {
    await admin.from("business_subscriptions").delete().eq("id", inserted.id);
    return { success: false, reason: "approve-failed" };
  }

  await admin.from("business_events_log").insert({
    business_registration_id: registrationId,
    event_type: "trial_started",
    actor_id: adminId,
    metadata: {
      planId: plan.planId,
      billingInterval: plan.snapshot.billingInterval,
      priceAmountIls: plan.snapshot.amountIls,
      priceVersion: plan.snapshot.priceVersion,
      offerCode: plan.offerCode,
      trialDays: plan.trialDays,
      nextBillingAt,
      provider: "sumit",
      billingConnected: false,
      activatedByAdminApproval: true,
      adminId,
    },
  });

  return { success: true, subscription: mapSubscriptionRowToBusinessSubscription(inserted), offerCode: plan.offerCode, trialDays: plan.trialDays, nextBillingAt };
}
