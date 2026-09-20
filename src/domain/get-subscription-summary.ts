import { BILLING_INTERVALS, getCurrentPrice, isBillingInterval, type BillingInterval, type PaidPlanId } from "@/data/subscription-pricing";
import { isValidBusinessSlug } from "@/utils/business-slug";
import type { Business } from "@/types/business";
import type { BusinessPlanId } from "@/types/business-plan";
import type { BusinessSubscription, SubscriptionAccess } from "@/types/subscription";
import type { BusinessSelfEditAccess } from "@/domain/get-business-self-edit-access";

/**
 * No payment provider is connected. While this is false the owner-facing screens never show a
 * billing date as a commitment, never say a payment was made, and never render a pay button.
 * Flip it only together with a real, verified billing integration.
 */
export const BILLING_PROVIDER_CONNECTED = false;

export type SubscriptionStage =
  | "basic"
  | "awaiting-approval"
  | "slug-required"
  | "awaiting-trial-start"
  | "admin-granted"
  | "trialing"
  | "active"
  | "grace-period"
  | "past-due"
  | "canceled"
  | "expired"
  | "paused";

export type SubscriptionPriceView = {
  amountIls: number;
  interval: BillingInterval;
  isLaunchPrice: boolean;
  /** "assigned": stored on the owner's subscription. "current-offer": the subscription has no stored price (legacy or not started yet), so this is only today's offer for a new joiner. */
  source: "assigned" | "current-offer";
};

export type SubscriptionSummary = {
  planId: BusinessPlanId;
  planName: string;
  stage: SubscriptionStage;
  statusLabel: string;
  statusDescription: string;
  billingInterval: BillingInterval | null;
  price: SubscriptionPriceView | null;
  trial: { startedAt: string; endsAt: string } | null;
  gracePeriodEndsAt: string | null;
  /** Non-null only when billing is really connected AND the date is known — never today. */
  nextBillingDate: string | null;
  editLimit: { label: string; detail: string };
  canStartTrial: boolean;
};

const PLAN_NAME: Record<BusinessPlanId, string> = { basic: "Basic", plus: "Plus", premium: "Premium" };

const STAGE_COPY: Record<SubscriptionStage, { label: string; description: string }> = {
  basic: { label: "רישום בסיסי (חינם)", description: "העסק מופיע בכרטיס בסיסי בארכיון העסקים. אפשר לשדרג ל־Plus או Premium בכל שלב." },
  "awaiting-approval": {
    label: "ממתין לאישור",
    description: "הרישום התקבל וממתין לאישור צוות הפורטל. תקופת הניסיון לא התחילה, והיא תתחיל רק לאחר האישור והפעלה מפורשת.",
  },
  "slug-required": {
    label: "ממתין להגדרת כתובת האתר",
    description: "העסק אושר. לפני הפעלת הניסיון צוות הפורטל צריך להגדיר לעסק כתובת (Slug) תקינה באנגלית.",
  },
  "awaiting-trial-start": {
    label: "אושר — הניסיון טרם הופעל",
    description: "העסק אושר וניתן להפעיל את 30 ימי הניסיון החינמיים. הניסיון לא התחיל עד להפעלה מפורשת.",
  },
  "admin-granted": { label: "חבילה פעילה (הוקצתה על ידי הפורטל)", description: "החבילה הופעלה על ידי מנהל הפורטל, ללא תקופת ניסיון או חיוב." },
  trialing: { label: "בתקופת ניסיון", description: "תקופת הניסיון החינמית פעילה. בשלב זה לא מתבצע חיוב." },
  active: { label: "מנוי פעיל", description: "המנוי פעיל." },
  "grace-period": { label: "תקופת חסד", description: "התגלתה בעיה בחיוב. העמוד ממשיך להיות מוצג עד סוף תקופת החסד." },
  "past-due": { label: "בעיה בחיוב", description: "לא הצלחנו להשלים את החיוב האחרון, והעמוד אינו מוצג כרגע. התוכן שמור." },
  canceled: { label: "המנוי בוטל", description: "המנוי בוטל. העמוד נשאר מוצג עד סוף התקופה ששולמה, והתוכן שמור." },
  expired: {
    label: "הניסיון הסתיים",
    description: "תקופת הניסיון הסתיימה. כל התוכן והתמונות שמורים, והעמוד אינו מוצג לציבור כרגע.",
  },
  paused: { label: "המנוי מושהה", description: "המנוי מושהה. פנו לצוות הפורטל לפרטים." },
};

function isPaid(planId: BusinessPlanId): planId is PaidPlanId {
  return planId === "plus" || planId === "premium";
}

function resolveStage(business: Business, subscription: BusinessSubscription | null, access: SubscriptionAccess | null, now: Date): SubscriptionStage {
  const selected = business.selectedPlanId ?? "basic";
  const active = business.activePlanId ?? "basic";

  if (!subscription) {
    if (isPaid(active)) return "admin-granted";
    if (!isPaid(selected)) return "basic";
    if (business.status !== "published") return "awaiting-approval";
    if (!isValidBusinessSlug(business.slug)) return "slug-required";
    return "awaiting-trial-start";
  }

  switch (subscription.status) {
    case "trialing":
      return new Date(subscription.trialEndsAt).getTime() > now.getTime() ? "trialing" : "expired";
    case "active":
      return "active";
    case "grace-period":
      return access?.reason === "grace-period" ? "grace-period" : "expired";
    case "past-due":
      return "past-due";
    case "canceled":
      return "canceled";
    case "paused":
      return "paused";
    default:
      return "expired";
  }
}

function describeEditLimit(
  activePlanId: BusinessPlanId,
  selectedPlanId: BusinessPlanId,
  selfEdit: BusinessSelfEditAccess | null,
): { label: string; detail: string } {
  if (activePlanId === "premium") {
    return { label: "עריכה עצמאית ללא הגבלה", detail: "אפשר לערוך את העסק בכל עת, כל עוד המנוי במצב שמאפשר עריכה." };
  }
  if (activePlanId === "plus") {
    const base = "אפשר לערוך את העסק פעם אחת בכל חודש קלנדרי (לפי שעון ישראל). רק שמירה מוצלחת נספרת.";
    if (selfEdit && !selfEdit.eligible && selfEdit.reason === "already-edited-this-month") {
      return { label: "עריכה אחת בחודש קלנדרי", detail: `${base} העריכה החודשית כבר נוצלה; אפשר לערוך שוב מתחילת החודש הבא.` };
    }
    if (selfEdit && !selfEdit.eligible) {
      return { label: "עריכה אחת בחודש קלנדרי", detail: `${base} כרגע העריכה אינה זמינה בגלל מצב המנוי.` };
    }
    return { label: "עריכה אחת בחודש קלנדרי", detail: `${base} העריכה החודשית עדיין זמינה.` };
  }
  if (isPaid(selectedPlanId)) {
    return {
      label: "עריכה עצמאית תיפתח עם הפעלת החבילה",
      detail: selectedPlanId === "plus" ? "בחבילת Plus: עריכה אחת בכל חודש קלנדרי." : "בחבילת Premium: עריכה ללא הגבלה.",
    };
  }
  return { label: "ללא עריכה עצמאית", detail: "בחבילת Basic שינויים בעסק מתבצעים דרך צוות הפורטל." };
}

/**
 * The single view-model behind the owner's "המנוי שלי" screen. It only reports what the stored
 * data says: prices come from the subscription's own snapshot (never silently from today's price
 * list), the launch label only appears when the stored snapshot says so, and no billing date is
 * ever produced while no payment provider is connected.
 */
export function getSubscriptionSummary(params: {
  business: Business;
  subscription: BusinessSubscription | null;
  access: SubscriptionAccess | null;
  selfEditAccess: BusinessSelfEditAccess | null;
  now: Date;
}): SubscriptionSummary {
  const { business, subscription, access, selfEditAccess, now } = params;
  const selected = business.selectedPlanId ?? "basic";
  const active = business.activePlanId ?? "basic";
  const stage = resolveStage(business, subscription, access, now);

  const subscriptionPlanId = subscription?.planId as BusinessPlanId | undefined;
  const displayPlanId: BusinessPlanId = subscriptionPlanId && isPaid(subscriptionPlanId) ? subscriptionPlanId : isPaid(active) ? active : selected;

  const interval = subscription?.billingInterval ?? (isBillingInterval(business.selectedBillingInterval) ? business.selectedBillingInterval : null);

  let price: SubscriptionPriceView | null = null;
  if (isPaid(displayPlanId)) {
    if (subscription && subscription.priceAmountIls !== undefined && subscription.billingInterval) {
      price = { amountIls: subscription.priceAmountIls, interval: subscription.billingInterval, isLaunchPrice: subscription.isLaunchPrice === true, source: "assigned" };
    } else if (interval && BILLING_INTERVALS.includes(interval)) {
      const offer = getCurrentPrice(displayPlanId, interval);
      price = { amountIls: offer.amountIls, interval, isLaunchPrice: offer.isLaunchPrice, source: "current-offer" };
    }
  }

  const copy = STAGE_COPY[stage];
  return {
    planId: displayPlanId,
    planName: PLAN_NAME[displayPlanId],
    stage,
    statusLabel: copy.label,
    statusDescription: copy.description,
    billingInterval: isPaid(displayPlanId) ? interval : null,
    price,
    trial: subscription?.trialStartedAt && subscription.trialEndsAt ? { startedAt: subscription.trialStartedAt, endsAt: subscription.trialEndsAt } : null,
    gracePeriodEndsAt: stage === "grace-period" ? (subscription?.gracePeriodEndsAt ?? null) : null,
    nextBillingDate: BILLING_PROVIDER_CONNECTED && subscription?.status === "active" ? (subscription.currentPeriodEndsAt ?? null) : null,
    editLimit: describeEditLimit(active, selected, selfEditAccess),
    canStartTrial: stage === "awaiting-trial-start",
  };
}
