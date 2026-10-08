/**
 * The one place that defines subscription OFFERS ("benefit groups"): what a trial costs and how
 * long it lasts for a given group of businesses. Prices are NOT part of an offer — every offer
 * charges the same launch prices from subscription-pricing.ts; an offer only decides the length of
 * the free trial. (A future offer could also carry its own price version; that is deliberately not
 * modelled until it exists.)
 *
 * An offer belongs to a BUSINESS (business_registrations.offer_code), never to a user — one owner
 * can have a pilot business and a standard one. It is set only by an admin, and is copied onto the
 * subscription row (offer_code + trial_days) the moment a trial is activated, so editing this table
 * later never changes a subscription that is already running.
 */
export type OfferCode = "launch_standard" | "pilot_2026";

export type SubscriptionOffer = {
  code: OfferCode;
  /** Admin-facing group name. */
  groupLabel: string;
  trialDays: number;
  /** What the owner / admin sees for this offer. */
  trialLabel: string;
};

export const SUBSCRIPTION_OFFERS: Record<OfferCode, SubscriptionOffer> = {
  launch_standard: { code: "launch_standard", groupLabel: "רגיל", trialDays: 30, trialLabel: "30 ימי ניסיון" },
  pilot_2026: { code: "pilot_2026", groupLabel: "פיילוט", trialDays: 90, trialLabel: "90 ימי ניסיון — הטבת פיילוט" },
};

export const OFFER_CODES = Object.keys(SUBSCRIPTION_OFFERS) as OfferCode[];

export const DEFAULT_OFFER_CODE: OfferCode = "launch_standard";

export function isOfferCode(value: unknown): value is OfferCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SUBSCRIPTION_OFFERS, value);
}

/** Unknown / missing codes fall back to the standard offer — never to something more generous. */
export function getOffer(code: unknown): SubscriptionOffer {
  return isOfferCode(code) ? SUBSCRIPTION_OFFERS[code] : SUBSCRIPTION_OFFERS[DEFAULT_OFFER_CODE];
}

export function getTrialDaysForOffer(code: unknown): number {
  return getOffer(code).trialDays;
}

/**
 * Pure: the trial window for an offer starting at `now`. Used by the server when a trial is
 * activated; it takes no client input — the offer comes from the stored business row.
 */
export function computeTrialWindow(code: unknown, now: Date): { offerCode: OfferCode; trialDays: number; trialStartedAt: string; trialEndsAt: string } {
  const offer = getOffer(code);
  const endsAt = new Date(now.getTime() + offer.trialDays * 24 * 60 * 60 * 1000);
  return { offerCode: offer.code, trialDays: offer.trialDays, trialStartedAt: now.toISOString(), trialEndsAt: endsAt.toISOString() };
}
