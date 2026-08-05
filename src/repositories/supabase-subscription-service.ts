import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { mapSubscriptionRowToBusinessSubscription } from "@/utils/map-subscription-row";
import { toRegistrationId } from "@/utils/business-id";
import type { BusinessSubscription } from "@/types/subscription";
import type { TrialEligibility } from "@/types/trial";

const TRIAL_DAYS = 30;

/**
 * The real, Supabase-backed half of SubscriptionRepository — everything here operates on
 * business_registrations/business_subscriptions rows identified by a "reg-"-prefixed businessId
 * (see src/utils/business-id.ts). mock-subscription-repository.ts routes to these functions
 * whenever it sees that prefix; the in-memory Map keeps handling the static demo businesses
 * exactly as before. Kept as a separate module (not a class implementing the interface itself) so
 * there's still exactly one SubscriptionRepository implementation, per spec section 3/22.
 */

export async function getRealSubscriptionByBusinessId(businessId: string): Promise<BusinessSubscription | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_subscriptions")
    .select("*")
    .eq("business_registration_id", toRegistrationId(businessId))
    .maybeSingle();
  if (error || !data) return null;
  return mapSubscriptionRowToBusinessSubscription(data);
}

/**
 * Every check the flow depends on, re-verified here server-side (spec section 6/9): identity was
 * already established by the caller (a real Supabase Auth session — see mock-auth-adapter.ts),
 * but ownership, approval, and "not already used" are always re-checked fresh against the
 * database, never trusted from anything the client sent.
 */
export async function checkRealTrialEligibility(businessId: string, ownerId: string): Promise<TrialEligibility> {
  if (!isSupabaseAdminConfigured()) return { eligible: false, reason: "business-not-found" };
  const admin = createAdminSupabaseClient();
  const registrationId = toRegistrationId(businessId);

  const { data: registration, error: registrationError } = await admin
    .from("business_registrations")
    .select("id, status, owner_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (registrationError || !registration) return { eligible: false, reason: "business-not-found" };
  if (registration.owner_id !== ownerId) return { eligible: false, reason: "business-not-owned" };
  if (registration.status !== "approved") return { eligible: false, reason: "business-not-approved" };

  const { data: existingSubscription, error: subscriptionError } = await admin
    .from("business_subscriptions")
    .select("id, status")
    .eq("business_registration_id", registrationId)
    .maybeSingle();
  if (subscriptionError) return { eligible: false, reason: "subscription-not-eligible" };
  if (existingSubscription) {
    if (existingSubscription.status === "trialing" || existingSubscription.status === "active") {
      return { eligible: false, reason: "active-subscription" };
    }
    // Any other existing row (expired/canceled/past-due/paused) means the one-time trial was already used.
    return { eligible: false, reason: "trial-already-used" };
  }

  return { eligible: true, reason: "eligible" };
}

export type StartRealTrialResult =
  | { success: true; subscription: BusinessSubscription }
  | { success: false; reason: "not-eligible" | "already-exists" | "unknown-error" };

/**
 * Atomic in the sense that matters here: the unique constraint on business_registration_id (see
 * the create_business_subscriptions migration) is what actually prevents a double-trial, not this
 * function's own re-check — two concurrent calls can both pass checkRealTrialEligibility and both
 * attempt the insert, but only one insert can ever succeed; the loser gets a clean, typed
 * "already-exists" result instead of a duplicate row (spec section 9/25).
 */
export async function startRealBusinessTrial(businessId: string, ownerId: string): Promise<StartRealTrialResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "unknown-error" };

  const eligibility = await checkRealTrialEligibility(businessId, ownerId);
  if (!eligibility.eligible) {
    return { success: false, reason: eligibility.reason === "trial-already-used" || eligibility.reason === "active-subscription" ? "already-exists" : "not-eligible" };
  }

  const admin = createAdminSupabaseClient();
  const registrationId = toRegistrationId(businessId);

  // The actual plan tier the owner chose — NOT a fixed "business-monthly" placeholder. This is the
  // fix for the bug where every trial's plan_id carried no real tier information at all, and
  // getBusinessListingAccess() had no way to tell Plus from Premium.
  const { data: registration, error: registrationError } = await admin
    .from("business_registrations")
    .select("plan_tier")
    .eq("id", registrationId)
    .maybeSingle();
  if (registrationError || !registration) {
    console.error("[startRealBusinessTrial] could not re-fetch plan_tier:", registrationError?.message);
    return { success: false, reason: "unknown-error" };
  }
  const planId: "plus" | "premium" = registration.plan_tier === "premium" ? "premium" : "plus";

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await admin
    .from("business_subscriptions")
    .insert({
      business_registration_id: registrationId,
      owner_id: ownerId,
      plan_id: planId,
      status: "trialing",
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      cancel_at_period_end: false,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, reason: "already-exists" };
    console.error("[startRealBusinessTrial] insert failed:", error.code, error.message);
    return { success: false, reason: "unknown-error" };
  }

  // Activate the plan immediately alongside the trial — this, not business_subscriptions.plan_id,
  // is what getBusinessListingAccess() actually gates display on (see src/types/business-plan.ts).
  const { error: activateError } = await admin.from("business_registrations").update({ active_plan_id: planId }).eq("id", registrationId);
  if (activateError) console.error("[startRealBusinessTrial] failed to activate plan:", activateError.message);

  const { error: logError } = await admin.from("business_events_log").insert({
    business_registration_id: registrationId,
    event_type: "trial_started",
    actor_id: ownerId,
    metadata: { planId },
  });
  if (logError) console.error("[startRealBusinessTrial] audit log insert failed:", logError.message);

  return { success: true, subscription: mapSubscriptionRowToBusinessSubscription(data) };
}

/** Calls the same public.expire_due_trials() Postgres function the hourly pg_cron job runs — a manual/programmatic trigger for the identical logic, not a separate implementation of it. */
export async function expireDueRealTrials(): Promise<number> {
  if (!isSupabaseAdminConfigured()) return 0;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("expire_due_trials");
  if (error) {
    console.error("[expireDueRealTrials] rpc failed:", error.message);
    return 0;
  }
  return data ?? 0;
}
