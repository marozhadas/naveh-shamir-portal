export type BusinessPlanTier = "free" | "plus" | "premium";

export type BusinessPlan = {
  tier: BusinessPlanTier;
  name: string;
  priceLabel: string;
  billingNote: string | null;
  description: string;
  features: string[];
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
    name: "רישום חינמי",
    priceLabel: "חינם",
    billingNote: null,
    description: "רישום בסיסי בארכיון העסקים של השכונה — נראות ראשונית, ללא עלות וללא התחייבות.",
    features: ["הופעה בארכיון העסקים", "פרטי קשר בסיסיים", "ללא כרטיס אשראי"],
    ctaLabel: "הרשמה חינמית",
    ctaHref: "/business/register",
    highlighted: false,
  },
  {
    tier: "plus",
    name: "Plus",
    priceLabel: "39 ₪",
    billingNote: "לחודש, חודש ראשון חינם",
    description: "עמוד עסק מלא עם תמונות, שירותים ופרטי קשר מורחבים — ליותר חשיפה ואמינות.",
    features: ["כל מה שכלול ברישום החינמי", "עמוד עסק מלא", "תמונות וגלריה", "רשימת שירותים", "חודש ראשון חינם"],
    ctaLabel: "מתחילים חודש חינם",
    ctaHref: "/business/register/plus",
    highlighted: true,
  },
  {
    tier: "premium",
    name: "Premium",
    priceLabel: "49 ₪",
    billingNote: "לחודש",
    description: "החשיפה המקסימלית באתר — הופעה מודגשת ותגית עסק מאומת.",
    features: ["כל מה שכלול ב-Plus", "הופעה מודגשת בארכיון", "תגית עסק מאומת", "עדיפות בתוצאות חיפוש"],
    ctaLabel: "בחירת Premium",
    ctaHref: "/business/register/premium",
    highlighted: false,
  },
];
