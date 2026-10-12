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
import { getPayMeConfigForBusiness, getPayMeConfigForRegistrant } from "@/lib/payme/flow-access";
import { buildPayMeCallbackUrl, getPayMeConfig, type PayMeConfig } from "@/lib/payme/config";
import type { OfferCode } from "@/data/subscription-offers";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import { cancelPayMeSubscription, generatePayMeSubscription, parsePayMeDateTime } from "@/lib/payme/client";
import { isValidSubPaymeId, paymeIterationType } from "@/lib/payme/payme-helpers";
import { buildSubscriptionPlan, type SubscriptionPlan } from "@/lib/payme/build-subscription-plan";
import { pickRegistrationAwaitingPayment, type PaymentResumeRegistration } from "@/lib/payme/payment-resume";

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

/** Same shape the payment action accepts from Hosted Fields (and the only shape ever read back out of billing_payment_methods). */
const PAYMENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,120}$/;

export type StartTrialWithPaymentMethodResult =
  | { success: true; subscription: BusinessSubscription }
  | { success: false; reason: "not-eligible" | "already-exists" | "payme-not-configured" | "payme-rejected" | "invalid-plan" | "approve-failed" | "unknown-error" };

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

  return activatePayMeSubscription({ config, registrationId, ownerId, plan: built.plan, paymentToken, cardMask, registrationUpdate: { active_plan_id: built.plan.planId } });
}

export type SavePaymentMethodResult = { success: true } | { success: false; reason: "payme-not-configured" | "not-eligible" | "already-exists" | "invalid-plan" | "unknown-error" };

/**
 * Step 6 of the Plus/Premium REGISTRATION: Hosted Fields only TOKENIZED the card (PayMe stored it in its vault, nothing was
 * charged). This keeps that token - PayMe confirmed it is the buyer_key - server-side, with the masked card for display, and
 * nothing else: no generate-subscription, no sub_payme_id, no trial dates, the business stays "pending" and unpublished. The
 * subscription is created later, by the admin's approval (activateRegistrationOnApproval).
 *
 * Only the signed-in owner's own pending registration qualifies; the sandbox is limited to the test-email list
 * (getPayMeConfigForRegistrant). Saving again (a retry, or a reload followed by a new tokenization) replaces the single row of
 * that registration - never a second one. The token is never logged, returned or put in an audit record.
 */
export async function savePaymentMethodForRegistration(
  registrationId: string,
  ownerId: string,
  registrantEmail: string | null | undefined,
  paymentToken: string,
  cardMask: string | null,
): Promise<SavePaymentMethodResult> {
  const config = await getPayMeConfigForRegistrant(registrantEmail);
  if (!config || !isSupabaseAdminConfigured()) return { success: false, reason: "payme-not-configured" };

  const admin = createAdminSupabaseClient();
  const { data: registration } = await admin
    .from("business_registrations")
    .select("id, status, plan_tier, selected_billing_interval, offer_code")
    .eq("id", registrationId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  // The owner's own registration, still waiting for the admin. (An approved or rejected business takes no new card here.)
  if (!registration || registration.status !== "pending") return { success: false, reason: "not-eligible" };

  const { data: existing, error: existingError } = await admin.from("business_subscriptions").select("id").eq("business_registration_id", registrationId).maybeSingle();
  if (existingError) return { success: false, reason: "unknown-error" };
  if (existing) return { success: false, reason: "already-exists" };

  // A plan that could never be billed (free tier, unknown track or offer) must not collect a card.
  if (!buildSubscriptionPlan(registration, new Date()).ok) return { success: false, reason: "invalid-plan" };

  const { error } = await admin.from("billing_payment_methods").upsert(
    { business_registration_id: registrationId, owner_id: ownerId, provider: "payme", provider_token: paymentToken, card_mask: cardMask, updated_at: new Date().toISOString() },
    { onConflict: "business_registration_id" },
  );
  if (error) return { success: false, reason: "unknown-error" };

  await admin.from("business_events_log").insert({ business_registration_id: registrationId, event_type: "payment_method_added", actor_id: ownerId, metadata: { provider: "payme", stage: "registration" } });
  return { success: true };
}

export type ActivateOnApprovalResult =
  | { success: true; subscription: BusinessSubscription; offerCode: OfferCode; trialDays: number }
  | {
      success: false;
      reason: "not-found" | "not-pending" | "no-owner" | "invalid-slug" | "no-payment-method" | "payme-not-configured" | "already-exists" | "invalid-plan" | "payme-rejected" | "approve-failed" | "unknown-error";
    };

/**
 * The admin's approval of a pending registration that entered a card at step 6 IS the activation: the trial starts and the
 * business goes online, in this order, and the business is only ever approved after PayMe created the subscription.
 *
 *   validate  ->  generate-subscription  ->  validate sub_payme_id  ->  persist subscription / trial  ->  approve + publish
 *
 * Validation (nothing is sent anywhere until all of it passes): the business exists, is still "pending", has an owner (an
 * existing user), has a clean English slug (it is published right now), has a saved buyer_key, no subscription yet, and a valid
 * plan - plan tier, billing interval, offer, price snapshot and trial days are read from the stored row only (offer_code was
 * chosen by the admin before approving: launch_standard = 30 days, pilot_2026 = 90). sub_start_date is computed here.
 *
 * Failure at any point leaves the business "pending", unpublished, with no trial and no revenue: a PayMe error or a missing
 * sub_payme_id changes nothing; if writing the subscription fails the PayMe subscription is cancelled again; if approving fails
 * after the subscription row was written, the PayMe subscription is cancelled and the row removed, so there is never a
 * half-approved state. The buyer_key is read here and only handed to PayMe - it is never logged or returned.
 */
export async function activateRegistrationOnApproval(registrationId: string, adminId: string): Promise<ActivateOnApprovalResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "unknown-error" };
  const config = getPayMeConfig();
  if (!config) return { success: false, reason: "payme-not-configured" };
  const admin = createAdminSupabaseClient();

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

  const { data: method } = await admin.from("billing_payment_methods").select("provider_token").eq("business_registration_id", registrationId).eq("provider", "payme").maybeSingle();
  const buyerKey = method?.provider_token;
  if (typeof buyerKey !== "string" || !PAYMENT_TOKEN_PATTERN.test(buyerKey)) return { success: false, reason: "no-payment-method" };

  const { data: existing, error: existingError } = await admin.from("business_subscriptions").select("id").eq("business_registration_id", registrationId).maybeSingle();
  if (existingError) return { success: false, reason: "unknown-error" };
  if (existing) return { success: false, reason: "already-exists" };

  const built = buildSubscriptionPlan(registration, new Date());
  if (!built.ok) return { success: false, reason: "invalid-plan" };
  const { plan } = built;

  const result = await activatePayMeSubscription({
    config,
    registrationId,
    ownerId: registration.owner_id,
    plan,
    paymentToken: buyerKey,
    cardMask: null,
    tokenAlreadyStored: true,
    registrationUpdate: { active_plan_id: plan.planId, status: "approved", reviewed_at: new Date().toISOString(), rejection_reason: null },
    approvalIsAtomicWithActivation: true,
    activatedBy: adminId,
  });
  if (!result.success) {
    return { success: false, reason: result.reason === "already-exists" ? "already-exists" : result.reason === "payme-rejected" ? "payme-rejected" : result.reason === "approve-failed" ? "approve-failed" : "unknown-error" };
  }
  return { success: true, subscription: result.subscription, offerCode: plan.offerCode, trialDays: plan.trialDays };
}

type ActivatePayMeSubscriptionInput = {
  config: PayMeConfig;
  registrationId: string;
  ownerId: string;
  plan: SubscriptionPlan;
  paymentToken: string;
  cardMask: string | null;
  /** The token is already saved (step 6): do not write it again, and keep it if PayMe refuses so the admin can retry. */
  tokenAlreadyStored?: boolean;
  /** Written to business_registrations only after the subscription row exists. */
  registrationUpdate: Partial<BusinessRegistrationRow>;
  /** Approval path: if this update fails the subscription is rolled back (PayMe cancelled, row removed) - never half approved. */
  approvalIsAtomicWithActivation?: boolean;
  /** Admin id when an admin's approval started the trial (audit trail); otherwise the owner started it. */
  activatedBy?: string;
};

/** The shared PayMe sequence: keep the token, create the subscription (first charge on sub_start_date), write the trial row with its snapshot, then update the business. Compensated at every step. */
async function activatePayMeSubscription(input: ActivatePayMeSubscriptionInput): Promise<StartTrialWithPaymentMethodResult> {
  const { config, registrationId, ownerId, plan, paymentToken, cardMask } = input;
  const admin = createAdminSupabaseClient();

  // 1) Keep the reusable token (server-only table; never the card itself).
  if (!input.tokenAlreadyStored) {
    const { error: methodError } = await admin.from("billing_payment_methods").upsert(
      { business_registration_id: registrationId, owner_id: ownerId, provider: "payme", provider_token: paymentToken, card_mask: cardMask, updated_at: new Date().toISOString() },
      { onConflict: "business_registration_id" },
    );
    if (methodError) return { success: false, reason: "unknown-error" };
  }
  const dropTokenOnFailure = async () => {
    if (!input.tokenAlreadyStored) await admin.from("billing_payment_methods").delete().eq("business_registration_id", registrationId);
  };

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
    await dropTokenOnFailure();
    return { success: false, reason: "payme-rejected" };
  }

  // Defence in depth: never activate on anything but a valid PayMe subscription id.
  if (!isValidSubPaymeId(created?.subPaymeId)) {
    console.error("[activatePayMeSubscription] PayMe returned no valid subscription id - nothing activated");
    await dropTokenOnFailure();
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

  // 4) Approve / publish (or just activate the plan, on the owner-started trial path).
  const { error: registrationError } = await admin.from("business_registrations").update(input.registrationUpdate).eq("id", registrationId);
  if (registrationError) {
    console.error("[activatePayMeSubscription] could not update the business row:", registrationError.message);
    if (input.approvalIsAtomicWithActivation) {
      // Never leave a half-approved business: stop the PayMe subscription and remove the trial row we just wrote.
      try {
        await cancelPayMeSubscription(created.subPaymeId);
      } catch (cancelError) {
        console.error("[activatePayMeSubscription] could not cancel the PayMe subscription after a failed approval:", cancelError instanceof Error ? cancelError.message : "unknown");
      }
      await admin.from("business_subscriptions").delete().eq("id", data.id);
      return { success: false, reason: "approve-failed" };
    }
  }

  // The audit log carries the full snapshot, including sub_start_date and the PayMe id (there is no dedicated column for the
  // start date; next_billing_at holds the same moment). Never the token.
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
    ...(input.activatedBy ? { activatedByAdminApproval: true, adminId: input.activatedBy } : {}),
  };
  await admin.from("business_events_log").insert([
    ...(input.tokenAlreadyStored ? [] : [{ business_registration_id: registrationId, event_type: "payment_method_added" as const, actor_id: ownerId, metadata: { provider: "payme" } }]),
    { business_registration_id: registrationId, event_type: "trial_started" as const, actor_id: input.activatedBy ?? ownerId, metadata: snapshotMetadata },
  ]);

  return { success: true, subscription: mapSubscriptionRowToBusinessSubscription(data) };
}

/**
 * The owner's pending paid registration that still needs step 6 (see pickRegistrationAwaitingPayment), or null. Read-only: it
 * creates nothing, and the card / subscription tables are asked for registration ids only (never the buyer_key).
 */
export async function findRegistrationAwaitingPaymentMethod(ownerId: string): Promise<PaymentResumeRegistration | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from("business_registrations")
    .select("id, owner_id, status, plan_tier, selected_billing_interval, offer_code, business_name, created_at")
    .eq("owner_id", ownerId)
    .eq("status", "pending")
    .in("plan_tier", ["plus", "premium"])
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !rows || rows.length === 0) return null;

  const ids = rows.map((row) => row.id);
  const [{ data: cards, error: cardsError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    admin.from("billing_payment_methods").select("business_registration_id").in("business_registration_id", ids),
    admin.from("business_subscriptions").select("business_registration_id").in("business_registration_id", ids),
  ]);
  if (cardsError || subscriptionsError) return null;

  return pickRegistrationAwaitingPayment(
    rows,
    ownerId,
    new Set((cards ?? []).map((row) => row.business_registration_id)),
    new Set((subscriptions ?? []).map((row) => row.business_registration_id)),
  );
}

export type SavedPaymentMethodInfo = { hasPaymentMethod: boolean; cardMask: string | null };

/** Admin view of a registration's saved card: ONLY whether one exists and its mask. The token is never selected here. */
export async function getSavedPaymentMethodInfo(registrationId: string): Promise<SavedPaymentMethodInfo> {
  if (!isSupabaseAdminConfigured()) return { hasPaymentMethod: false, cardMask: null };
  const { data } = await createAdminSupabaseClient().from("billing_payment_methods").select("card_mask").eq("business_registration_id", registrationId).eq("provider", "payme").maybeSingle();
  return { hasPaymentMethod: Boolean(data), cardMask: data?.card_mask ?? null };
}

export type CancelForRejectionResult = { success: true; hadSubscription: boolean } | { success: false; reason: "payme-error" };

/**
 * Admin rejects a business. Before the status changes:
 *  - a PayMe subscription that already exists (only possible after an approval) is cancelled through the existing cancel path,
 *    so a PayMe failure never leaves a rejected business that is still being billed;
 *  - a business that only completed step 6 has NO PayMe subscription, so nothing is cancelled (and nothing is created to be
 *    cancelled) - its saved card token is simply removed here, so it can never be used for anything.
 */
export async function cancelPayMeSubscriptionForRejection(registrationId: string, adminId: string): Promise<CancelForRejectionResult> {
  if (!isSupabaseAdminConfigured()) return { success: true, hadSubscription: false };
  const admin = createAdminSupabaseClient();
  const { data: sub } = await admin.from("business_subscriptions").select("*").eq("business_registration_id", registrationId).eq("payment_provider", "payme").maybeSingle();

  let hadSubscription = false;
  if (sub && sub.provider_subscription_id && sub.status !== "canceled" && sub.status !== "expired") {
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
    hadSubscription = true;
  }

  // Make the saved card unusable on our side (a rejected business never needs it again).
  await admin.from("billing_payment_methods").delete().eq("business_registration_id", registrationId);
  return { success: true, hadSubscription };
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
