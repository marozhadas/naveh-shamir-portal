import type { BusinessPlanId } from "@/types/business-plan";
import type { SubscriptionAccess } from "@/types/subscription";

/**
 * Whether a business owner may save a self-edit right now (`/business/dashboard/profile`), and
 * why not if not.
 *
 * This composes — deliberately WITHOUT replacing — two pre-existing, independently-tested domain
 * functions that, as of this writing, are each defined but never actually consumed by any page or
 * action:
 *   - `getBusinessListingAccess` (src/domain/get-business-listing-access.ts) computes
 *     `canSelfEdit` from plan tier alone: true only for "premium", false for "basic"/"plus". It
 *     drives PUBLIC display gating (archive cards, profile page rendering) and this function does
 *     not change that — Plus's public-facing `canSelfEdit: false` there is a separate concept
 *     ("is self-editing possible at all for this tier, ever") from the finer-grained "how often"
 *     rule this function adds for the OWNER-facing editor.
 *   - `getSubscriptionAccess` (src/domain/get-subscription-access.ts) computes `canEdit` purely
 *     from subscription status (trialing/active/canceled-but-paid/past-due/paused/expired), with
 *     NO awareness of plan tier — e.g. a past-due or paused subscription still returns
 *     `canEdit: true` there (by design: editing a draft while publish/visibility is limited is
 *     allowed, so a payment hiccup doesn't strand the owner's in-progress edits).
 *
 * Today, `/business/dashboard/profile` checks neither of these — any signed-in owner with a
 * resolved business can save, regardless of plan or subscription state. This function is the new,
 * single gate for that page going forward; it does not alter what either existing function
 * returns, and does not touch anything driving public site display.
 *
 * The three plan-tier rules (spec): Basic — no self-edit access at all, ever. Plus — allowed only
 * once per calendar month (Asia/Jerusalem), and only while the underlying subscription is in a
 * state `getSubscriptionAccess` already permits editing in. Premium — unlimited saves, same
 * subscription-state precondition.
 */

export type BusinessSelfEditAccess =
  | { eligible: true }
  | {
      eligible: false;
      reason: "plan-not-eligible" | "no-subscription" | "subscription-not-editable" | "already-edited-this-month";
      /** Only set for "already-edited-this-month" — the first moment (UTC instant) of the next Asia/Jerusalem calendar month. */
      nextEligibleAt?: string;
    };

type Params = {
  activePlanId: BusinessPlanId;
  /** Null when the business has never had a subscription/trial record at all (e.g. a plan an admin granted directly with no billing history — see BusinessListingAccessReason "admin-granted"). */
  subscriptionAccess: SubscriptionAccess | null;
  /** ISO timestamp of the last successful self-edit save, or null if never edited. */
  lastSelfEditAt: string | null;
  now: Date;
};

const JERUSALEM_TIME_ZONE = "Asia/Jerusalem";

/** "YYYY-MM" for `date` as a wall-clock calendar month in Asia/Jerusalem — DST-safe via Intl, no date library needed. */
function jerusalemYearMonth(date: Date): { year: number; month: number; key: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: JERUSALEM_TIME_ZONE, year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month, key: `${year}-${String(month).padStart(2, "0")}` };
}

/** The first instant of the next Asia/Jerusalem calendar month after `now`, as a UTC ISO string — used only for display ("ניתן יהיה לערוך שוב החל מ-1 לחודש הבא"), not for the eligibility comparison itself (that uses jerusalemYearMonth's DST-safe key). */
function startOfNextJerusalemMonth(now: Date): string {
  const { year, month } = jerusalemYearMonth(now);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  // Jerusalem is always UTC+2 or UTC+3, so UTC midnight of the 1st still falls within calendar
  // day 1 in Jerusalem — safe without knowing the exact DST offset for a future date.
  return new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0)).toISOString();
}

export function getBusinessSelfEditAccess({ activePlanId, subscriptionAccess, lastSelfEditAt, now }: Params): BusinessSelfEditAccess {
  if (activePlanId === "basic") {
    return { eligible: false, reason: "plan-not-eligible" };
  }

  if (!subscriptionAccess) {
    return { eligible: false, reason: "no-subscription" };
  }
  if (!subscriptionAccess.canEdit) {
    return { eligible: false, reason: "subscription-not-editable" };
  }

  if (activePlanId === "premium") {
    return { eligible: true };
  }

  // activePlanId === "plus" — once per calendar month.
  if (lastSelfEditAt) {
    const lastKey = jerusalemYearMonth(new Date(lastSelfEditAt)).key;
    const nowKey = jerusalemYearMonth(now).key;
    if (lastKey === nowKey) {
      return { eligible: false, reason: "already-edited-this-month", nextEligibleAt: startOfNextJerusalemMonth(now) };
    }
  }
  return { eligible: true };
}
