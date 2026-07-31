import type { BusinessSubscription, SubscriptionAccess } from "@/types/subscription";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysRemaining(until: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(until).getTime() - now.getTime()) / MS_PER_DAY));
}

/**
 * The single source of truth for what a subscription's current state actually permits — no
 * component or page should re-derive this from raw subscription fields (spec section 10). Time
 * is checked directly against `now` rather than trusting `status` blindly, so stale data (e.g. a
 * `trialing` record whose `trialEndsAt` has already passed) degrades safely to "expired" access
 * instead of silently keeping the business live.
 */
export function getSubscriptionAccess(subscription: BusinessSubscription, now: Date): SubscriptionAccess {
  if (subscription.status === "trialing") {
    const remaining = daysRemaining(subscription.trialEndsAt, now);
    if (remaining > 0) {
      return {
        canEdit: true,
        canPreview: true,
        canPublish: true,
        canAppearInArchive: true,
        canManageSubscription: true,
        daysRemainingInTrial: remaining,
        reason: "trial-active",
      };
    }
    // trialEndsAt has passed but the record wasn't transitioned yet — treat as expired.
    return {
      canEdit: false,
      canPreview: true,
      canPublish: false,
      canAppearInArchive: false,
      canManageSubscription: true,
      daysRemainingInTrial: 0,
      reason: "trial-expired",
    };
  }

  if (subscription.status === "active") {
    return {
      canEdit: true,
      canPreview: true,
      canPublish: true,
      canAppearInArchive: true,
      canManageSubscription: true,
      daysRemainingInTrial: null,
      reason: "subscription-active",
    };
  }

  if (subscription.status === "canceled") {
    // cancelAtPeriodEnd keeps the business live through the period already paid for (spec
    // section 39) — only once currentPeriodEndsAt actually passes does access drop.
    const stillWithinPaidPeriod = Boolean(
      subscription.currentPeriodEndsAt && new Date(subscription.currentPeriodEndsAt).getTime() > now.getTime(),
    );
    return {
      canEdit: true,
      canPreview: true,
      canPublish: stillWithinPaidPeriod,
      canAppearInArchive: stillWithinPaidPeriod,
      canManageSubscription: true,
      daysRemainingInTrial: null,
      reason: "subscription-canceled",
    };
  }

  if (subscription.status === "past-due") {
    // No explicit grace period is defined (spec section 40: "allow grace only if explicitly
    // defined"), so past-due does not keep the business published.
    return {
      canEdit: true,
      canPreview: true,
      canPublish: false,
      canAppearInArchive: false,
      canManageSubscription: true,
      daysRemainingInTrial: null,
      reason: "payment-past-due",
    };
  }

  if (subscription.status === "paused") {
    return {
      canEdit: true,
      canPreview: true,
      canPublish: false,
      canAppearInArchive: false,
      canManageSubscription: true,
      daysRemainingInTrial: null,
      reason: "subscription-paused",
    };
  }

  // "expired" — trial ended with no active payment (spec section 7). Content is preserved but
  // not editable/publishable until the subscription is renewed.
  return {
    canEdit: false,
    canPreview: true,
    canPublish: false,
    canAppearInArchive: false,
    canManageSubscription: true,
    daysRemainingInTrial: 0,
    reason: "trial-expired",
  };
}
