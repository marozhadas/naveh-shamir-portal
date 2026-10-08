import type { OfferCode } from "@/data/subscription-offers";

export type OfferChangeAuditAction = "business-pilot-assigned" | "business-pilot-removed" | "business-offer-changed";

export type OfferChangeDecision =
  | { ok: true; changed: false }
  | { ok: true; changed: true; auditAction: OfferChangeAuditAction }
  | { ok: false; reason: "subscription-exists" };

/**
 * Pure rule for "may an admin switch this business to another offer right now, and how is it
 * audited". The only precondition is that no subscription row exists yet: the moment a trial is
 * activated its offer + trial length are snapshotted and frozen (the DB trigger
 * prevent_offer_change_after_subscription enforces the same thing). Changing the benefit of a trial
 * that already started is deliberately NOT possible through this path — that needs its own
 * confirmed, audited flow, and must never silently move trial_ends_at.
 */
export function decideOfferChange(params: { currentOffer: OfferCode; requestedOffer: OfferCode; hasSubscription: boolean }): OfferChangeDecision {
  const { currentOffer, requestedOffer, hasSubscription } = params;
  if (currentOffer === requestedOffer) return { ok: true, changed: false };
  if (hasSubscription) return { ok: false, reason: "subscription-exists" };

  if (requestedOffer === "pilot_2026") return { ok: true, changed: true, auditAction: "business-pilot-assigned" };
  if (currentOffer === "pilot_2026" && requestedOffer === "launch_standard") return { ok: true, changed: true, auditAction: "business-pilot-removed" };
  return { ok: true, changed: true, auditAction: "business-offer-changed" };
}
