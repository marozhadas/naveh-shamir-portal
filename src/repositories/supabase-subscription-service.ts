import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { mapSubscriptionRowToBusinessSubscription } from "@/utils/map-subscription-row";
import { toRegistrationId } from "@/utils/business-id";
import { isValidBusinessSlug } from "@/utils/business-slug";
import type { BusinessSubscription } from "@/types/subscription";
import type { TrialEligibility } from "@/types/trial";
import { createPriceSnapshot, isBillingInterval } from "@/data/subscription-pricing";
import { computeTrialWindow } from "@/data/subscription-offers";
import { getSiteOrigin } from "@/utils/site-origin";
import { buildPayMeCallbackUrl, getPayMeConfig, isPayMeConfigured } from "@/lib/payme/config";
import { cancelPayMeSubscription, generatePayMeSubscription, parsePayMeDateTime } from "@/lib/payme/client";
import { agorotFromIls, computeSubscriptionStartDate, formatPayMeDate, paymeIterationType } from "@/lib/payme/payme-helpers";

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
    .select("id, status, owner_id, slug")
    .eq("id", registrationId)
    .maybeSingle();
  if (registrationError || !registration) return { eligible: false, reason: "business-not-found" };
  if (registration.owner_id !== ownerId) return { eligible: false, reason: "business-not-owned" };
  if (registration.status !== "approved") return { eligible: false, reason: "business-not-approved" };
  // Going live (what starting a trial does) requires a clean, admin-approved English slug —
  // spec section 13: never publish a page with a Hebrew/auto-generated URL.
  if (!isValidBusinessSlug(registration.slug)) return { eligible: false, reason: "invalid-slug" };

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
  | { success: false; reason: "not-eligible" | "already-exists" | "payment-method-required" | "unknown-error" };

/**
 * Atomic in the sense that matters here: the unique constraint on business_registration_id (see
 * the create_business_subscriptions migration) is what actually prevents a double-trial, not this
 * function's own re-check — two concurrent calls can both pass checkRealTrialEligibility and both
 * attempt the insert, but only one insert can ever succeed; the loser gets a clean, typed
 * "already-exists" result instead of a duplicate row (spec section 9/25).
 */
export async function startRealBusinessTrial(businessId: string, ownerId: string): Promise<StartRealTrialResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "unknown-error" };
  // Once PayMe is configured a trial is only ever started WITH a payment method (see
  // startRealBusinessTrialWithPaymentMethod) — the card-less path is closed, also against crafted requests.
  if (isPayMeConfigured()) return { success: false, reason: "payment-method-required" };

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
    .select("plan_tier, selected_billing_interval, offer_code")
    .eq("id", registrationId)
    .maybeSingle();
  if (registrationError || !registration) {
    console.error("[startRealBusinessTrial] could not re-fetch plan_tier:", registrationError?.message);
    return { success: false, reason: "unknown-error" };
  }
  const planId: "plus" | "premium" = registration.plan_tier === "premium" ? "premium" : "plus";

  // The price assigned to this subscription is fixed here, from the owner's chosen billing track and
  // the price version offered today — a later list-price change never rewrites this row.
  const snapshot = createPriceSnapshot(planId, isBillingInterval(registration.selected_billing_interval) ? registration.selected_billing_interval : "monthly");

  // Trial length comes ONLY from the offer stored on the business row (set by an admin) — read fresh
  // from the database right here, never from anything the client sent. The result is snapshotted onto
  // the subscription below, so a later change to the offer cannot touch this trial.
  const now = new Date();
  const trial = computeTrialWindow(registration.offer_code, now);

  const { data, error } = await admin
    .from("business_subscriptions")
    .insert({
      business_registration_id: registrationId,
      owner_id: ownerId,
      plan_id: planId,
      status: "trialing",
      trial_started_at: trial.trialStartedAt,
      trial_ends_at: trial.trialEndsAt,
      offer_code: trial.offerCode,
      trial_days: trial.trialDays,
      cancel_at_period_end: false,
      billing_interval: snapshot.billingInterval,
      price_amount_ils: snapshot.amountIls,
      price_version: snapshot.priceVersion,
      is_launch_price: snapshot.isLaunchPrice,
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
    metadata: { planId, billingInterval: snapshot.billingInterval, priceVersion: snapshot.priceVersion, offerCode: trial.offerCode, trialDays: trial.trialDays },
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

export type StartTrialWithPaymentMethodResult =
  | { success: true; subscription: BusinessSubscription }
  | { success: false; reason: "not-eligible" | "already-exists" | "payme-not-configured" | "payme-rejected" | "unknown-error" };

/**
 * The PayMe-backed way to start a trial (used instead of startRealBusinessTrial once PayMe is configured):
 * approved business → payment method tokenized in PayMe Hosted Fields (the card never touches our servers) →
 * token reaches us → PayMe subscription created with its FIRST charge dated exactly at the trial end →
 * trial row written with the full snapshot (offer, trial days, price, interval, PayMe ids).
 *
 * Order matters and is compensated: the PayMe subscription is created BEFORE the local row, and if the local
 * insert then loses a race (unique constraint — a double click), the PayMe subscription is cancelled again,
 * so a business can never end up charged without a trial row or with two PayMe subscriptions. Trial length
 * comes only from the offer stored on the business (server-side), exactly as in startRealBusinessTrial.
 * Nothing here ever logs or returns the token.
 */
export async function startRealBusinessTrialWithPaymentMethod(
  businessId: string,
  ownerId: string,
  paymentToken: string,
  cardMask: string | null,
): Promise<StartTrialWithPaymentMethodResult> {
  const config = getPayMeConfig();
  if (!config || !isSupabaseAdminConfigured()) return { success: false, reason: "payme-not-configured" };

  const eligibility = await checkRealTrialEligibility(businessId, ownerId);
  if (!eligibility.eligible) {
    return { success: false, reason: eligibility.reason === "trial-already-used" || eligibility.reason === "active-subscription" ? "already-exists" : "not-eligible" };
  }

  const admin = createAdminSupabaseClient();
  const registrationId = toRegistrationId(businessId);

  const { data: registration } = await admin
    .from("business_registrations")
    .select("plan_tier, selected_billing_interval, offer_code, business_name")
    .eq("id", registrationId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!registration) return { success: false, reason: "not-eligible" };

  const planId: "plus" | "premium" = registration.plan_tier === "premium" ? "premium" : "plus";
  const interval = isBillingInterval(registration.selected_billing_interval) ? registration.selected_billing_interval : "monthly";
  const snapshot = createPriceSnapshot(planId, interval);
  const trial = computeTrialWindow(registration.offer_code, new Date());

  // 1) Keep the reusable token (server-only table; never the card itself).
  const { error: methodError } = await admin.from("billing_payment_methods").upsert(
    { business_registration_id: registrationId, owner_id: ownerId, provider: "payme", provider_token: paymentToken, card_mask: cardMask, updated_at: new Date().toISOString() },
    { onConflict: "business_registration_id" },
  );
  if (methodError) return { success: false, reason: "unknown-error" };

  // 2) Create the PayMe subscription — first charge exactly when the trial ends.
  let created;
  try {
    created = await generatePayMeSubscription({
      buyerKey: paymentToken,
      merchantSubscriptionId: registrationId,
      priceAgorot: agorotFromIls(snapshot.amountIls),
      iterationType: paymeIterationType(interval),
      startDate: formatPayMeDate(computeSubscriptionStartDate(new Date(trial.trialEndsAt), interval)),
      description: `${planId === "premium" ? "Premium" : "Plus"} — ${interval === "monthly" ? "מנוי חודשי" : "מנוי שנתי"} | פורטל נווה שמיר`,
      callbackUrl: buildPayMeCallbackUrl(getSiteOrigin(), config.webhookSecret),
    });
  } catch (error) {
    console.error("[startRealBusinessTrialWithPaymentMethod] PayMe subscription failed:", error instanceof Error ? error.message : "unknown");
    await admin.from("billing_payment_methods").delete().eq("business_registration_id", registrationId);
    return { success: false, reason: "payme-rejected" };
  }

  // 3) The local trial row, with the full snapshot.
  const { data, error } = await admin
    .from("business_subscriptions")
    .insert({
      business_registration_id: registrationId,
      owner_id: ownerId,
      plan_id: planId,
      status: "trialing",
      trial_started_at: trial.trialStartedAt,
      trial_ends_at: trial.trialEndsAt,
      offer_code: trial.offerCode,
      trial_days: trial.trialDays,
      cancel_at_period_end: false,
      billing_interval: snapshot.billingInterval,
      price_amount_ils: snapshot.amountIls,
      price_version: snapshot.priceVersion,
      is_launch_price: snapshot.isLaunchPrice,
      payment_provider: "payme",
      provider_subscription_id: created.subPaymeId,
      next_billing_at: parsePayMeDateTime(created.nextDate)?.toISOString() ?? null,
    })
    .select()
    .single();

  if (error) {
    // Lost a race or failed to write — undo the PayMe side so nobody is ever charged without a trial row.
    try {
      await cancelPayMeSubscription(created.subPaymeId);
    } catch (cancelError) {
      console.error("[startRealBusinessTrialWithPaymentMethod] could not cancel orphaned PayMe subscription:", cancelError instanceof Error ? cancelError.message : "unknown");
    }
    if (error.code === "23505") return { success: false, reason: "already-exists" };
    console.error("[startRealBusinessTrialWithPaymentMethod] insert failed:", error.code, error.message);
    return { success: false, reason: "unknown-error" };
  }

  await admin.from("business_registrations").update({ active_plan_id: planId }).eq("id", registrationId);
  await admin.from("business_events_log").insert([
    { business_registration_id: registrationId, event_type: "payment_method_added", actor_id: ownerId, metadata: { provider: "payme" } },
    {
      business_registration_id: registrationId,
      event_type: "trial_started",
      actor_id: ownerId,
      metadata: { planId, billingInterval: snapshot.billingInterval, priceVersion: snapshot.priceVersion, offerCode: trial.offerCode, trialDays: trial.trialDays, provider: "payme" },
    },
  ]);

  return { success: true, subscription: mapSubscriptionRowToBusinessSubscription(data) };
}

/** The masked card (never the token) of a business's payment method, for the owner's own "המנוי שלי" screen. Owner-checked. */
export async function getOwnedPaymentMethodMask(businessId: string, ownerId: string): Promise<{ hasPaymentMethod: boolean; cardMask: string | null }> {
  if (!isSupabaseAdminConfigured()) return { hasPaymentMethod: false, cardMask: null };
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("billing_payment_methods")
    .select("card_mask")
    .eq("business_registration_id", toRegistrationId(businessId))
    .eq("owner_id", ownerId)
    .maybeSingle();
  return { hasPaymentMethod: Boolean(data), cardMask: data?.card_mask ?? null };
}

export type CancelPayMeSubscriptionResult = { success: true } | { success: false; reason: "not-found" | "already-ended" | "payme-error" };

/**
 * Owner-initiated cancel of a PayMe-managed subscription: PayMe's cancel-subscription is called first, and only
 * after PayMe confirms does the local row change (canceled, cancel_at_period_end, access kept through the trial /
 * the already-paid period — nothing is deleted and nothing is refunded automatically). The owner filter makes a
 * foreign business id a no-op.
 */
export async function cancelOwnedPayMeSubscription(businessId: string, ownerId: string): Promise<CancelPayMeSubscriptionResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "payme-error" };
  const admin = createAdminSupabaseClient();
  const { data: sub } = await admin
    .from("business_subscriptions")
    .select("*")
    .eq("business_registration_id", toRegistrationId(businessId))
    .eq("owner_id", ownerId)
    .eq("payment_provider", "payme")
    .maybeSingle();
  if (!sub || !sub.provider_subscription_id) return { success: false, reason: "not-found" };
  if (sub.status === "canceled" || sub.status === "expired") return { success: false, reason: "already-ended" };

  try {
    await cancelPayMeSubscription(sub.provider_subscription_id);
  } catch (error) {
    console.error("[cancelOwnedPayMeSubscription] PayMe cancel failed:", error instanceof Error ? error.message : "unknown");
    return { success: false, reason: "payme-error" };
  }

  const nowIso = new Date().toISOString();
  let accessUntil: string | null = sub.current_period_ends_at;
  if (sub.status === "trialing") accessUntil = sub.trial_ends_at;
  const { error } = await admin
    .from("business_subscriptions")
    .update({ status: "canceled", cancel_at_period_end: true, canceled_at: nowIso, current_period_ends_at: accessUntil })
    .eq("id", sub.id);
  if (error) return { success: false, reason: "payme-error" };

  await admin.from("business_events_log").insert({
    business_registration_id: sub.business_registration_id,
    event_type: "subscription_canceled",
    actor_id: ownerId,
    metadata: { provider: "payme", initiatedBy: "owner" },
  });
  return { success: true };
}
