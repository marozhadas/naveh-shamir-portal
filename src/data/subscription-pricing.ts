/**
 * The single source of truth for paid-plan prices and trial length. Every pricing surface
 * (/business/plans, the Plus/Premium registration pages and wizard, /business/trial, the owner's
 * "המנוי שלי" screen, the public owner CTA) reads from here, so they can never contradict each other.
 *
 * Prices are versioned. A subscription stores its own snapshot of (interval, amount, version,
 * isLaunchPrice) when it is created (see startRealBusinessTrial), so adding a new version below —
 * with new prices for new joiners — never rewrites what an existing subscription was assigned.
 * This only avoids automatic overwrites; it makes no contractual price-lock promise to anyone.
 */

export type PaidPlanId = "plus" | "premium";
export type BillingInterval = "monthly" | "yearly";

export const BILLING_INTERVALS: BillingInterval[] = ["monthly", "yearly"];

export const TRIAL_DAYS = 30;

export const LAUNCH_PRICE_LABEL = "מחיר השקה";

export const BILLING_INTERVAL_LABEL: Record<BillingInterval, string> = {
  monthly: "חודשי",
  yearly: "שנתי",
};

export type PriceVersion = {
  id: string;
  /** True only when this version's prices are explicitly launch prices — drives the "מחיר השקה" label. */
  isLaunchPrice: boolean;
  prices: Record<PaidPlanId, Record<BillingInterval, number>>;
};

export const PRICE_VERSIONS: Record<string, PriceVersion> = {
  "launch-2026": {
    id: "launch-2026",
    isLaunchPrice: true,
    prices: {
      plus: { monthly: 39, yearly: 390 },
      premium: { monthly: 49, yearly: 490 },
    },
  },
};

/** The version offered to NEW joiners. Existing subscriptions keep the version stored on their own row. */
export const CURRENT_PRICE_VERSION_ID = "launch-2026";

export type PriceSnapshot = {
  billingInterval: BillingInterval;
  amountIls: number;
  priceVersion: string;
  isLaunchPrice: boolean;
};

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}

export function getCurrentPriceVersion(): PriceVersion {
  return PRICE_VERSIONS[CURRENT_PRICE_VERSION_ID];
}

/** The price a NEW joiner is offered right now for a plan + billing track. */
export function getCurrentPrice(planId: PaidPlanId, interval: BillingInterval): PriceSnapshot {
  const version = getCurrentPriceVersion();
  return { billingInterval: interval, amountIls: version.prices[planId][interval], priceVersion: version.id, isLaunchPrice: version.isLaunchPrice };
}

/** What gets stored on a subscription row when it is created. */
export function createPriceSnapshot(planId: PaidPlanId, interval: BillingInterval): PriceSnapshot {
  return getCurrentPrice(planId, interval);
}

export function formatIls(amount: number): string {
  return `${amount} ₪`;
}

export function formatPriceWithInterval(amountIls: number, interval: BillingInterval): string {
  return `${formatIls(amountIls)} ${interval === "monthly" ? "לחודש" : "לשנה"}`;
}
