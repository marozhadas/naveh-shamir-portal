export type SubscriptionPlan = {
  id: "business-monthly";
  name: string;
  billingInterval: "month";
  trialDays: 30;
  /** null until a real price is approved — never fabricate a demo price (spec section 9). */
  priceAmount: number | null;
  currency: "ILS";
  features: string[];
  active: boolean;
};

/** The single plan offered today. `priceAmount: null` — no price has been approved yet. */
export const BUSINESS_MONTHLY_PLAN: SubscriptionPlan = {
  id: "business-monthly",
  name: "עמוד עסק בפורטל",
  billingInterval: "month",
  trialDays: 30,
  priceAmount: null,
  currency: "ILS",
  features: [
    "עמוד עסק מלא",
    "תמונות וגלריה",
    "פרטי קשר ושעות פעילות",
    "רשימת שירותים",
    "קישורים חברתיים",
    "הופעה באינדקס העסקים",
    "שיתוף קל",
    "עדכון עצמאי בכל עת",
    "חודש ראשון חינם",
  ],
  active: true,
};
