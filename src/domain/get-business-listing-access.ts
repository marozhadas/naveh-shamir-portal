import type { Business } from "@/types/business";
import type { BusinessSubscription } from "@/types/subscription";
import type { SubscriptionRepository } from "@/repositories/subscription-repository";
import type { BusinessListingAccess, BusinessListingAccessReason } from "@/types/business-listing-access";
import { isPubliclyVisibleStatus } from "@/types/business-status";

/** Safety net for a business id missing from an access map (should never happen — every business passed through getListingAccessByBusinessId gets an entry) — fails closed to basic, never premium. */
export const FALLBACK_BASIC_ACCESS: BusinessListingAccess = {
  canAppearInArchive: true,
  canOpenProfile: false,
  canShowVerifiedBadge: false,
  canShowFullContactDetails: false,
  canShowGallery: false,
  canShowServices: false,
  canShowOpeningHours: false,
  canSelfEdit: false,
  canBeHomepageFeatured: false,
  tier: "basic",
  reason: "basic-listing",
};

function basicAccess(canAppearInArchive: boolean, reason: BusinessListingAccessReason): BusinessListingAccess {
  return {
    canAppearInArchive,
    canOpenProfile: false,
    canShowVerifiedBadge: false,
    canShowFullContactDetails: false,
    canShowGallery: false,
    canShowServices: false,
    canShowOpeningHours: false,
    canSelfEdit: false,
    canBeHomepageFeatured: false,
    tier: "basic",
    reason,
  };
}

/**
 * Full profile page — gallery, services, hours, contact details — but explicitly WITHOUT the
 * verified badge or self-edit access, which are Premium-only (spec: Plus is a real upgrade from
 * the free listing, not the full Premium experience).
 */
function plusAccess(reason: BusinessListingAccessReason): BusinessListingAccess {
  return {
    canAppearInArchive: true,
    canOpenProfile: true,
    canShowVerifiedBadge: false,
    canShowFullContactDetails: true,
    canShowGallery: true,
    canShowServices: true,
    canShowOpeningHours: true,
    canSelfEdit: false,
    canBeHomepageFeatured: false,
    tier: "plus",
    reason,
  };
}

function premiumAccess(reason: BusinessListingAccessReason): BusinessListingAccess {
  return {
    canAppearInArchive: true,
    canOpenProfile: true,
    canShowVerifiedBadge: true,
    canShowFullContactDetails: true,
    canShowGallery: true,
    canShowServices: true,
    canShowOpeningHours: true,
    canSelfEdit: true,
    canBeHomepageFeatured: true,
    tier: "premium",
    reason,
  };
}

function fullAccessForPlan(planId: "plus" | "premium", reason: BusinessListingAccessReason): BusinessListingAccess {
  return planId === "plus" ? plusAccess(reason) : premiumAccess(reason);
}

/**
 * The single central place that decides what a business is allowed to show — no component or
 * page should re-derive this from raw `subscription.status` checks (spec section 2). Admin
 * approval (business.status) only ever determines whether a business is allowed to exist in
 * public listings at all.
 *
 * `business.activePlanId` — NOT `subscription.planId` — is the single source of truth for which
 * paid tier is live (see src/types/business-plan.ts). This is deliberate: it's what lets an admin
 * grant/revoke Plus or Premium with one click (changeBusinessPlanAction) with no subscription row
 * required at all, and it's what fixes the bug where every real subscription's `planId` was
 * hardcoded to `"business-monthly"` — a value that carried no actual plan-tier information. The
 * `subscription` argument is still consulted for two narrow, automatic safety nets that override
 * even an admin-set activePlanId (a payment that's actively failing; a trial whose end date has
 * already passed but the hourly cron hasn't caught up yet) and to pick a more specific `reason` for
 * admin-facing display — it never itself grants access.
 */
export function getBusinessListingAccess(
  business: Business,
  subscription: BusinessSubscription | null,
  now: Date,
): BusinessListingAccess {
  // Records with no `status` at all predate the field and are treated as published (matches the
  // same convention already used by src/utils/business-filters.ts's isVisible()).
  const status = business.status ?? "published";

  if (status === "suspended" || status === "archived") {
    return basicAccess(false, "business-suspended");
  }
  if (!isPubliclyVisibleStatus(status)) {
    // draft / pending-review — not yet approved for any public listing at all.
    return basicAccess(false, "business-not-approved");
  }

  const activePlanId = business.activePlanId ?? "basic";
  const grantOrBasic = (reason: BusinessListingAccessReason): BusinessListingAccess =>
    activePlanId === "basic" ? basicAccess(true, "basic-listing") : fullAccessForPlan(activePlanId, reason);

  // No subscription row at all: purely activePlanId-driven — this is what lets an admin grant a
  // tier with zero subscription rows required (changeBusinessPlanAction), and what a fresh
  // plus/premium registration looks like before any trial has started (activePlanId is "basic"
  // until then, matching spec section 6's "pending" state).
  if (!subscription) {
    return grantOrBasic("admin-granted");
  }

  if (subscription.status === "active") {
    return grantOrBasic("subscription-active");
  }

  if (subscription.status === "trialing") {
    const trialActive = new Date(subscription.trialEndsAt).getTime() > now.getTime();
    return trialActive ? grantOrBasic("trial-active") : basicAccess(true, "subscription-expired");
  }

  if (subscription.status === "canceled") {
    // cancelAtPeriodEnd keeps access through the period already paid for.
    const stillWithinPaidPeriod = Boolean(
      subscription.cancelAtPeriodEnd && subscription.currentPeriodEndsAt && new Date(subscription.currentPeriodEndsAt).getTime() > now.getTime(),
    );
    return stillWithinPaidPeriod ? grantOrBasic("subscription-active") : basicAccess(true, "subscription-expired");
  }

  if (subscription.status === "past-due") {
    return basicAccess(true, "subscription-past-due");
  }

  // "expired" and "paused" both drop to basic — content stays, nothing is deleted.
  return basicAccess(true, "subscription-expired");
}

/**
 * Computes access for a whole list of businesses in one pass — the shape every page that renders
 * more than one business card (the archive, related businesses, the homepage) needs, keyed by
 * business id so it can travel across the Server → Client Component boundary as a plain object.
 */
export async function getListingAccessByBusinessId(
  businesses: Business[],
  subscriptionRepository: Pick<SubscriptionRepository, "getByBusinessId">,
  now: Date,
): Promise<Record<string, BusinessListingAccess>> {
  const entries = await Promise.all(
    businesses.map(async (business) => {
      const subscription = await subscriptionRepository.getByBusinessId(business.id);
      return [business.id, getBusinessListingAccess(business, subscription, now)] as const;
    }),
  );
  return Object.fromEntries(entries);
}
