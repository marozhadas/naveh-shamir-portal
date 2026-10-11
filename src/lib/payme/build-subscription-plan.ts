import { createPriceSnapshot, isBillingInterval, type BillingInterval, type PaidPlanId, type PriceSnapshot } from "@/data/subscription-pricing";
import { computeTrialWindow, isOfferCode, type OfferCode } from "@/data/subscription-offers";
import { PAYME_MIN_SUB_PRICE_AGOROT, agorotFromIls, computeSubStartDate } from "./payme-helpers";

/**
 * Everything the PayMe subscription is created from, derived on the SERVER from the stored business row and the price
 * snapshot - the browser contributes nothing but PayMe's token. Pure (no I/O, no secrets) so it is unit-tested directly.
 *
 * It refuses (never guesses) when the plan, billing track, offer or price is not valid: a subscription is only ever created
 * for a plan the owner really chose, with the price of the matching snapshot and a known offer's trial length.
 */

export type SubscriptionPlanRow = {
  plan_tier: unknown;
  selected_billing_interval: unknown;
  offer_code: unknown;
};

export type SubscriptionPlan = {
  planId: PaidPlanId;
  interval: BillingInterval;
  offerCode: OfferCode;
  trialDays: number;
  trialStartedAt: string;
  trialEndsAt: string;
  snapshot: PriceSnapshot;
  priceAgorot: number;
  /** dd/mm/yyyy - the date of the first charge (Israel time). */
  subStartDate: string;
};

export type BuildSubscriptionPlanResult = { ok: true; plan: SubscriptionPlan } | { ok: false; reason: "invalid-plan" | "invalid-interval" | "invalid-offer" | "invalid-price" };

export function buildSubscriptionPlan(row: SubscriptionPlanRow, now: Date): BuildSubscriptionPlanResult {
  if (row.plan_tier !== "plus" && row.plan_tier !== "premium") return { ok: false, reason: "invalid-plan" };
  const planId: PaidPlanId = row.plan_tier;

  // A business that never picked a track is on the monthly one (the registration default); anything else must be valid.
  const rawInterval = row.selected_billing_interval ?? "monthly";
  if (!isBillingInterval(rawInterval)) return { ok: false, reason: "invalid-interval" };
  const interval: BillingInterval = rawInterval;

  if (!isOfferCode(row.offer_code)) return { ok: false, reason: "invalid-offer" };

  const snapshot = createPriceSnapshot(planId, interval);
  const priceAgorot = agorotFromIls(snapshot.amountIls);
  if (!Number.isFinite(snapshot.amountIls) || !Number.isInteger(priceAgorot) || priceAgorot < PAYME_MIN_SUB_PRICE_AGOROT) return { ok: false, reason: "invalid-price" };

  const trial = computeTrialWindow(row.offer_code, now);
  return {
    ok: true,
    plan: {
      planId,
      interval,
      offerCode: trial.offerCode,
      trialDays: trial.trialDays,
      trialStartedAt: trial.trialStartedAt,
      trialEndsAt: trial.trialEndsAt,
      snapshot,
      priceAgorot,
      subStartDate: computeSubStartDate(now, trial.trialDays, interval),
    },
  };
}
