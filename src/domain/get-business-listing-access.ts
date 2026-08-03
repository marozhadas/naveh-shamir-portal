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
    tier: "premium",
    reason,
  };
}

/** Any planId other than "plus" is treated as Premium — matches every subscription created before this tier existed (planId="business-monthly"). */
function fullAccessForPlan(planId: string, reason: BusinessListingAccessReason): BusinessListingAccess {
  return planId === "plus" ? plusAccess(reason) : premiumAccess(reason);
}

/**
 * The single central place that decides what a business is allowed to show — no component or
 * page should re-derive this from raw `subscription.status` checks (spec section 2). Admin
 * approval (business.status) only ever determines whether a business is allowed to exist in
 * public listings at all; the subscription/trial state on top of that determines whether it gets
 * the full "premium" experience (open profile, verified badge, gallery, services, hours).
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

  if (!subscription) {
    return basicAccess(true, "basic-listing");
  }

  if (subscription.status === "active") {
    return fullAccessForPlan(subscription.planId, "subscription-active");
  }

  if (subscription.status === "trialing") {
    const trialActive = new Date(subscription.trialEndsAt).getTime() > now.getTime();
    return trialActive ? fullAccessForPlan(subscription.planId, "trial-active") : basicAccess(true, "subscription-expired");
  }

  if (subscription.status === "canceled") {
    // cancelAtPeriodEnd keeps full access through the period already paid for.
    const stillWithinPaidPeriod = Boolean(
      subscription.cancelAtPeriodEnd &&
        subscription.currentPeriodEndsAt &&
        new Date(subscription.currentPeriodEndsAt).getTime() > now.getTime(),
    );
    return stillWithinPaidPeriod ? fullAccessForPlan(subscription.planId, "subscription-active") : basicAccess(true, "subscription-expired");
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
