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
import { buildPayMeCallbackUrl } from "@/lib/payme/config";
import { getPayMeConfigForBusiness, getPayMeConfigForRegistrant } from "@/lib/payme/flow-access";
import type { PayMeConfig } from "@/lib/payme/config";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import { cancelPayMeSubscription, generatePayMeSubscription, parsePayMeDateTime } from "@/lib/payme/client";
import { isValidSubPaymeId, paymeIterationType } from "@/lib/payme/payme-helpers";
import { buildSubscriptionPlan, type SubscriptionPlan } from "@/lib/payme/build-subscription-plan";

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
  // Once PayMe is open FOR THIS BUSINESS (live, or sandbox with the admin test switch on) a trial is only ever
  // started WITH a payment method (see startRealBusinessTrialWithPaymentMethod) — the card-less path is closed
  // for it, also against crafted requests. Other businesses keep the card-less trial while PayMe is sandbox-only.
  if (await getPayMeConfigForBusiness(businessId)) return { success: false, reason: "payment-method-required" };

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
  | { success: false; reason: "not-eligible" | "already-exists" | "payme-not-configured" | "payme-rejected" | "invalid-plan" | "unknown-error" };

/**
 * The PayMe-backed way to start a trial (used instead of startRealBusinessTrial once PayMe is configured):
 * approved business -> card tokenized in PayMe Hosted Fields (the card never touches our servers; tokenization only
 * stores it in PayMe's vault and charges nothing) -> the permanent token reaches us and is sent to PayMe as the buyer_key
 * in generate-subscription, with sub_start_date = today (Israel) + the trial days -> trial row written with the full
 * snapshot (offer, trial days, interval, price, start date, PayMe subscription id).
 *
 * Nothing the browser sends decides money or time: the plan, billing track and offer are re-read from the business row,
 * the price comes from the price snapshot, the trial length from the offer, sub_start_date is computed here
 * (buildSubscriptionPlan). If any of them is not valid, or PayMe does not answer with a valid subscription id, no
 * subscription (and no trial row, no active plan) is created.
 *
 * Order matters and is compensated: the PayMe subscription is created BEFORE the local row, and if the local
 * insert then loses a race (unique constraint - a double click), the PayMe subscription is cancelled again,
 * so a business can never end up charged without a trial row or with two PayMe subscriptions.
 * Nothing here ever logs or returns the token.
 */
export async function startRealBusinessTrialWithPaymentMethod(
  businessId: string,
  ownerId: string,
  paymentToken: string,
  cardMask: string | null,
): Promise<StartTrialWithPaymentMethodResult> {
  // Enforced here, where the flow really starts: in sandbox only an admin-enabled business gets a config at all.
  const config = await getPayMeConfigForBusiness(businessId);
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

  // Plan, price snapshot, trial length and first-charge date - all decided on the server; invalid => nothing is created.
  const built = buildSubscriptionPlan(registration, new Date());
  if (!built.ok) {
    console.error("[startRealBusinessTrialWithPaymentMethod] refusing to create a subscription:", built.reason);
    return { success: false, reason: "invalid-plan" };
  }

  return activatePayMeSubscription({ config, registrationId, ownerId, plan: built.plan, paymentToken, cardMask, registrationUpdate: { active_plan_id: built.plan.planId }, autoApproved: false });
}

/**
 * Step 6 of the Plus/Premium REGISTRATION: the owner has just submitted the business (row exists, status "pending") and now
 * enters the card. On success the PayMe subscription is created (token = buyer_key, first charge on sub_start_date) AND the
 * business goes live immediately - no admin approval is waited for (owner decision: an admin contacts the owner personally
 * if something is wrong; rejecting a live business cancels its PayMe subscription, see cancelPayMeSubscriptionForRejection).
 *
 * Same guarantees as startRealBusinessTrialWithPaymentMethod: the business is the signed-in owner's own row (owner_id
 * checked), the plan / price / offer / dates come only from that row, an invalid plan or a missing sub_payme_id creates and
 * activates nothing, and the sandbox is limited to the test-email list. Sandbox rule: getPayMeConfigForRegistrant.
 */
export async function completeRegistrationWithPayment(
  registrationId: string,
  ownerId: string,
  registrantEmail: string | null | undefined,
  paymentToken: string,
  cardMask: string | null,
): Promise<StartTrialWithPaymentMethodResult> {
  const config = await getPayMeConfigForRegistrant(registrantEmail);
  if (!config || !isSupabaseAdminConfigured()) return { success: false, reason: "payme-not-configured" };

  const admin = createAdminSupabaseClient();
  const { data: registration } = await admin
    .from("business_registrations")
    .select("id, status, slug, plan_tier, selected_billing_interval, offer_code")
    .eq("id", registrationId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  // Only the owner's own registration, and only one that is still waiting (or was already approved) - never a rejected,
  // suspended or archived business.
  if (!registration || (registration.status !== "pending" && registration.status !== "approved")) return { success: false, reason: "not-eligible" };

  const { data: existing, error: existingError } = await admin.from("business_subscriptions").select("id").eq("business_registration_id", registrationId).maybeSingle();
  if (existingError) return { success: false, reason: "unknown-error" };
  if (existing) return { success: false, reason: "already-exists" };

  const built = buildSubscriptionPlan(registration, new Date());
  if (!built.ok) {
    console.error("[completeRegistrationWithPayment] refusing to create a subscription:", built.reason);
    return { success: false, reason: "invalid-plan" };
  }

  // Going live needs a clean English slug (spec: never publish a Hebrew URL). A registration slug is auto-generated from the
  // business name and is usually Hebrew, so a stable English one is derived from the id; an admin can still change it later
  // (changeBusinessSlugAction records a redirect from the old address).
  const slug = isValidBusinessSlug(registration.slug) ? registration.slug : `business-${registrationId.slice(0, 8)}`;
  return activatePayMeSubscription({
    config,
    registrationId,
    ownerId,
    plan: built.plan,
    paymentToken,
    cardMask,
    registrationUpdate: { active_plan_id: built.plan.planId, status: "approved", reviewed_at: new Date().toISOString(), rejection_reason: null, slug },
    autoApproved: true,
  });
}

type ActivatePayMeSubscriptionInput = {
  config: PayMeConfig;
  registrationId: string;
  ownerId: string;
  plan: SubscriptionPlan;
  paymentToken: string;
  cardMask: string | null;
  /** Written to business_registrations only after the subscription row exists. */
  registrationUpdate: Partial<BusinessRegistrationRow>;
  autoApproved: boolean;
};

/** The shared PayMe sequence: keep the token, create the subscription (first charge on sub_start_date), write the trial row with its snapshot, then update the business. Compensated at every step. */
async function activatePayMeSubscription(input: ActivatePayMeSubscriptionInput): Promise<StartTrialWithPaymentMethodResult> {
  const { config, registrationId, ownerId, plan, paymentToken, cardMask } = input;
  const admin = createAdminSupabaseClient();

  // 1) Keep the reusable token (server-only table; never the card itself).
  const { error: methodError } = await admin.from("billing_payment_methods").upsert(
    { business_registration_id: registrationId, owner_id: ownerId, provider: "payme", provider_token: paymentToken, card_mask: cardMask, updated_at: new Date().toISOString() },
    { onConflict: "business_registration_id" },
  );
  if (methodError) return { success: false, reason: "unknown-error" };

  // 2) Create the PayMe subscription - the token IS the buyer_key; the first charge is on sub_start_date, not now.
  let created;
  try {
    created = await generatePayMeSubscription({
      buyerKey: paymentToken,
      merchantSubscriptionId: registrationId,
      priceAgorot: plan.priceAgorot,
      iterationType: paymeIterationType(plan.interval),
      startDate: plan.subStartDate,
      description: `${plan.planId === "premium" ? "Premium" : "Plus"} - ${plan.interval === "monthly" ? "מנוי חודשי" : "מנוי שנתי"} | פורטל נווה שמיר`,
      callbackUrl: buildPayMeCallbackUrl(getSiteOrigin(), config.webhookSecret),
    });
  } catch (error) {
    console.error("[activatePayMeSubscription] PayMe subscription failed:", error instanceof Error ? error.message : "unknown");
    await admin.from("billing_payment_methods").delete().eq("business_registration_id", registrationId);
    return { success: false, reason: "payme-rejected" };
  }

  // Defence in depth: never activate on anything but a valid PayMe subscription id.
  if (!isValidSubPaymeId(created?.subPaymeId)) {
    console.error("[activatePayMeSubscription] PayMe returned no valid subscription id - nothing activated");
    await admin.from("billing_payment_methods").delete().eq("business_registration_id", registrationId);
    return { success: false, reason: "payme-rejected" };
  }

  // 3) The local trial row, with the full snapshot. next_billing_at is PayMe's own next date when it reports one,
  //    otherwise the first-charge date we asked for (start of that day, Israel time).
  const nextBillingAt = parsePayMeDateTime(created.nextDate) ?? parseDayMonthYearAsJerusalemMidnight(plan.subStartDate);
  const { data, error } = await admin
    .from("business_subscriptions")
    .insert({
      business_registration_id: registrationId,
      owner_id: ownerId,
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
      payment_provider: "payme",
      provider_subscription_id: created.subPaymeId,
      next_billing_at: nextBillingAt?.toISOString() ?? null,
    })
    .select()
    .single();

  if (error) {
    // Lost a race or failed to write - undo the PayMe side so nobody is ever charged without a trial row.
    try {
      await cancelPayMeSubscription(created.subPaymeId);
    } catch (cancelError) {
      console.error("[activatePayMeSubscription] could not cancel orphaned PayMe subscription:", cancelError instanceof Error ? cancelError.message : "unknown");
    }
    if (error.code === "23505") return { success: false, reason: "already-exists" };
    console.error("[activatePayMeSubscription] insert failed:", error.code, error.message);
    return { success: false, reason: "unknown-error" };
  }

  const { error: registrationError } = await admin.from("business_registrations").update(input.registrationUpdate).eq("id", registrationId);
  if (registrationError) console.error("[activatePayMeSubscription] could not update the business row:", registrationError.message);

  // The audit log carries the full snapshot, including sub_start_date and the PayMe id (there is no dedicated column for the
  // start date; next_billing_at holds the same moment).
  const snapshotMetadata = {
    planId: plan.planId,
    billingInterval: plan.snapshot.billingInterval,
    priceAmountIls: plan.snapshot.amountIls,
    priceVersion: plan.snapshot.priceVersion,
    offerCode: plan.offerCode,
    trialDays: plan.trialDays,
    subStartDate: plan.subStartDate,
    subPaymeId: created.subPaymeId,
    provider: "payme",
    ...(input.autoApproved ? { autoApproved: true } : {}),
  };
  await admin.from("business_events_log").insert([
    { business_registration_id: registrationId, event_type: "payment_method_added", actor_id: ownerId, metadata: { provider: "payme" } },
    { business_registration_id: registrationId, event_type: "trial_started", actor_id: ownerId, metadata: snapshotMetadata },
  ]);

  return { success: true, subscription: mapSubscriptionRowToBusinessSubscription(data) };
}

export type CancelForRejectionResult = { success: true; hadSubscription: boolean } | { success: false; reason: "payme-error" };

/**
 * Admin rejected (or otherwise removed) a business that may already be live through the step-6 payment: its PayMe
 * subscription must stop, otherwise the owner would still be charged for a page that is no longer shown. No subscription
 * (or one that already ended) is fine. Called BEFORE the status change, so a PayMe failure never leaves a rejected business
 * that is still being billed.
 */
export async function cancelPayMeSubscriptionForRejection(registrationId: string, adminId: string): Promise<CancelForRejectionResult> {
  if (!isSupabaseAdminConfigured()) return { success: true, hadSubscription: false };
  const admin = createAdminSupabaseClient();
  const { data: sub } = await admin.from("business_subscriptions").select("*").eq("business_registration_id", registrationId).eq("payment_provider", "payme").maybeSingle();
  if (!sub || !sub.provider_subscription_id || sub.status === "canceled" || sub.status === "expired") return { success: true, hadSubscription: false };

  try {
    await cancelPayMeSubscription(sub.provider_subscription_id);
  } catch (error) {
    console.error("[cancelPayMeSubscriptionForRejection] PayMe cancel failed:", error instanceof Error ? error.message : "unknown");
    return { success: false, reason: "payme-error" };
  }

  const nowIso = new Date().toISOString();
  const { error } = await admin.from("business_subscriptions").update({ status: "canceled", cancel_at_period_end: false, canceled_at: nowIso }).eq("id", sub.id);
  if (error) return { success: false, reason: "payme-error" };
  await admin.from("business_events_log").insert({
    business_registration_id: registrationId,
    event_type: "subscription_canceled",
    actor_id: adminId,
    metadata: { provider: "payme", initiatedBy: "admin-rejection" },
  });
  return { success: true, hadSubscription: true };
}

/** "dd/mm/yyyy" (an Israel calendar date) -> that day's 00:00 in Israel time. */
function parseDayMonthYearAsJerusalemMidnight(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  return parsePayMeDateTime(`${match[3]}-${match[2]}-${match[1]} 00:00:00`);
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
