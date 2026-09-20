import { getCurrentPrice, TRIAL_DAYS, type PriceSnapshot } from "@/data/subscription-pricing";

export type BusinessPlanTier = "free" | "plus" | "premium";

export type BusinessPlan = {
  tier: BusinessPlanTier;
  name: string;
  description: string;
  /** null for the free tier. Prices come only from subscription-pricing.ts. */
  pricing: { monthly: PriceSnapshot; yearly: PriceSnapshot } | null;
  /** null for the free tier; the same for the monthly and the yearly track. */
  trialDays: number | null;
  features: string[];
  /** Real differences vs. the tier above — shown so the comparison is honest, not just a list of positives. */
  notIncluded: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted: boolean;
};

/**
 * The three tiers shown on /business/plans. Registration itself still collects the same fields
 * for every tier (see business/register/schema.ts) — the tier only decides which extended
 * intro/context the registration page shows and which plan_tier value gets stored on the
 * registration row, not a different set of required business details.
 */
export const BUSINESS_PLANS: BusinessPlan[] = [
  {
    tier: "free",
    name: "Basic",
    description: "רישום חינמי בארכיון העסקים של השכונה — נראות ראשונית, ללא עלות וללא התחייבות.",
    pricing: null,
    trialDays: null,
    features: ["כרטיס עסק בסיסי בארכיון", "תמונה אחת", "הצגת מספר טלפון"],
    notIncluded: ["ללא כפתור WhatsApp", "ללא עמוד עסק פנימי", "ללא תג \"עסק מאומת\"", "ללא עריכה עצמאית"],
    ctaLabel: "הרשמה חינמית",
    ctaHref: "/business/register",
    highlighted: false,
  },
  {
    tier: "plus",
    name: "Plus",
    description: "עמוד עסק מלא עם גלריה, שירותים ושעות פעילות — ליותר חשיפה ואמינות.",
    pricing: { monthly: getCurrentPrice("plus", "monthly"), yearly: getCurrentPrice("plus", "yearly") },
    trialDays: TRIAL_DAYS,
    features: [
      "עמוד עסק מלא",
      "גלריית תמונות",
      "רשימת שירותים",
      "שעות פעילות",
      "דרכי יצירת קשר",
      "עריכת העסק פעם אחת בכל חודש קלנדרי (לפי שעון ישראל)",
    ],
    notIncluded: ["ללא תג \"עסק מאומת\"", "ללא זכאות להצגה באזור העסקים הנבחרים בעמוד הבית"],
    ctaLabel: "מתחילים ניסיון חינם",
    ctaHref: "/business/register/plus",
    highlighted: true,
  },
  {
    tier: "premium",
    name: "Premium",
    description: "כל יכולות Plus, עם תג עסק מאומת ועריכה עצמאית ללא הגבלה.",
    pricing: { monthly: getCurrentPrice("premium", "monthly"), yearly: getCurrentPrice("premium", "yearly") },
    trialDays: TRIAL_DAYS,
    features: [
      "כל יכולות Plus",
      "תג \"עסק מאומת\"",
      "עריכה עצמאית ללא הגבלה",
      "זכאות להופיע באזור העסקים הנבחרים בעמוד הבית (ההצגה בפועל נקבעת על ידי מנהל הפורטל)",
    ],
    notIncluded: [],
    ctaLabel: "מתחילים ניסיון חינם",
    ctaHref: "/business/register/premium",
    highlighted: false,
  },
];

export function getBusinessPlan(tier: BusinessPlanTier): BusinessPlan {
  return BUSINESS_PLANS.find((plan) => plan.tier === tier)!;
}
