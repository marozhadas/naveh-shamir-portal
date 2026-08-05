import { z } from "zod";
import { BUSINESS_CATEGORIES } from "@/data/business-categories";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";

export const BUSINESS_TYPE_OPTIONS = [
  { id: "store", label: "חנות" },
  { id: "service-provider", label: "נותן שירות" },
  { id: "home-business", label: "עסק ביתי" },
  { id: "clinic", label: "קליניקה" },
  { id: "restaurant", label: "מסעדה או מזון" },
  { id: "other", label: "עסק אחר" },
] as const;

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export const WEEKDAY_LABEL: Record<(typeof WEEKDAYS)[number], string> = {
  sunday: "ראשון",
  monday: "שני",
  tuesday: "שלישי",
  wednesday: "רביעי",
  thursday: "חמישי",
  friday: "שישי",
  saturday: "שבת",
};

const PHONE_PATTERN = /^\+?[0-9-\s]{6,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Every schema below is exported and reused as-is by the wizard's per-step/per-item client
 * validators (see PlusRegistrationWizard.tsx) — the actual rules (min lengths, regexes, cross-field
 * refinements) live here once. The client never re-implements a rule; it only re-parses the same
 * schema against a subset of the data to get step-scoped / item-scoped error messages, and the
 * server (actions.ts) parses the full combined schema as the final source of truth.
 */
export const mediaSchema = z.object({ url: z.string().min(1), alt: z.string().trim().max(200) });
export const gallerySchema = mediaSchema.extend({ order: z.number().int().min(0) });

export const serviceSchema = z.object({
  title: z.string().trim().min(1, "יש להזין שם שירות").max(120, "שם השירות ארוך מדי"),
  description: z.string().trim().max(300, "התיאור ארוך מדי").optional(),
  priceLabel: z.string().trim().max(60, "התווית ארוכה מדי").optional(),
});

export const intervalSchema = z
  .object({
    opensAt: z.string().regex(TIME_PATTERN, "שעת פתיחה אינה תקינה"),
    closesAt: z.string().regex(TIME_PATTERN, "שעת סגירה אינה תקינה"),
  })
  .refine((value) => value.opensAt < value.closesAt, { message: "שעת הסגירה חייבת להיות אחרי שעת הפתיחה" });

export const openingHoursDaySchema = z
  .object({
    day: z.enum(WEEKDAYS),
    closed: z.boolean(),
    intervals: z.array(intervalSchema).max(3, "יותר מדי טווחי שעות ליום אחד"),
  })
  .superRefine((value, ctx) => {
    if (value.closed) return;
    if (value.intervals.length === 0) {
      ctx.addIssue({ code: "custom", path: ["intervals"], message: "יש לבחור שעת סיום" });
      return;
    }
    const sorted = [...value.intervals].sort((a, b) => a.opensAt.localeCompare(b.opensAt));
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].opensAt < sorted[i - 1].closesAt) {
        ctx.addIssue({ code: "custom", path: ["intervals"], message: "שני טווחי השעות חופפים" });
        break;
      }
    }
  });

const promotionSchema = z.object({
  title: z.string().trim().min(1, "יש להזין כותרת למבצע").max(120, "הכותרת ארוכה מדי"),
  description: z.string().trim().max(300, "התיאור ארוך מדי").optional(),
  validUntil: z.string().trim().optional(),
});

/** The raw object shape (no cross-field refinements yet) — kept separate so both the full
 * server-side schema below AND the wizard's step-scoped schemas can `.pick()` fields from it
 * without losing that ability (ZodEffects, what `.superRefine()` returns, has no `.pick()`). */
export const plusBusinessRegistrationObjectSchema = z.object({
  registrationId: z.string().uuid(),
  planId: z.enum(["plus", "premium"]),

  businessName: z.string().trim().min(1, "יש להזין שם עסק").max(120, "שם העסק ארוך מדי — עד 120 תווים"),
  categoryIds: z
    .array(z.string())
    .min(1, "יש לבחור לפחות קטגוריה אחת")
    .refine((ids) => ids.every((id) => BUSINESS_CATEGORIES.some((category) => category.id === id)), {
      message: "יש לבחור קטגוריות מהרשימה בלבד",
    }),
  businessType: z.string().refine((value) => BUSINESS_TYPE_OPTIONS.some((option) => option.id === value), {
    message: "יש לבחור סוג עסק מהרשימה",
  }),

  contactName: z.string().trim().min(1, "יש להזין שם איש/אשת קשר").max(120, "השם ארוך מדי"),
  contactPhone: z.string().trim().regex(PHONE_PATTERN, "מספר הטלפון אינו תקין"),
  contactEmail: z.string().trim().regex(EMAIL_PATTERN, "כתובת המייל אינה תקינה"),

  publicPhone: z.string().trim().regex(PHONE_PATTERN, "מספר הטלפון הציבורי אינו תקין"),
  publicWhatsapp: z.string().trim().refine((value) => !value || PHONE_PATTERN.test(value), { message: "מספר הוואטסאפ אינו תקין" }),
  publicEmail: z.string().trim().refine((value) => !value || EMAIL_PATTERN.test(value), { message: "כתובת המייל הציבורית אינה תקינה" }),

  shortDescription: z.string().trim().min(1, "יש להזין תיאור קצר").max(180, "התיאור הקצר ארוך מדי — עד 180 תווים"),
  fullDescription: z.string().trim().min(100, "התיאור המלא קצר מדי — לפחות 100 תווים").max(2000, "התיאור המלא ארוך מדי"),

  addressType: z.enum(["physical", "service-area", "both"]),
  address: z.string().trim().max(200).optional(),
  serviceArea: z.string().trim().max(200).optional(),

  coverImage: mediaSchema,
  gallery: z.array(gallerySchema).max(7, "עד 7 תמונות גלריה נוספות (8 בסך הכול כולל התמונה הראשית)"),

  services: z.array(serviceSchema).min(1, "יש להוסיף לפחות שירות אחד").max(12, "עד 12 שירותים"),
  openingHours: z.array(openingHoursDaySchema).length(7, "יש להגדיר את כל ימות השבוע"),

  websiteUrl: z.string().trim().refine((value) => !value || isSafeHrefOrEmpty(value), { message: "כתובת האתר אינה תקינה" }),
  instagramUrl: z.string().trim().refine((value) => !value || isSafeHrefOrEmpty(value), { message: "קישור האינסטגרם אינו תקין" }),
  facebookUrl: z.string().trim().refine((value) => !value || isSafeHrefOrEmpty(value), { message: "קישור הפייסבוק אינו תקין" }),
  tiktokUrl: z.string().trim().refine((value) => !value || isSafeHrefOrEmpty(value), { message: "קישור הטיקטוק אינו תקין" }),

  promotion: promotionSchema.nullable(),

  // z.literal(true, { message }) silently drops the custom message in this Zod version (it falls
  // back to the raw "Invalid literal value, expected true") — z.boolean().refine() is the reliable
  // way to get our own Hebrew message through, here and for the other three consent fields below.
  publicationConsent: z.boolean().refine((v) => v === true, { message: "יש לאשר את פרסום הפרטים" }),
  termsAccepted: z.boolean().refine((v) => v === true, { message: "יש לאשר את תנאי השימוש" }),
  // Plus offers a free trial month; Premium (spec: no promised free month) does not — required
  // only for planId="plus", see the superRefine below.
  trialConsent: z.boolean().optional(),
  // Required only for planId="premium" — see the superRefine below. Optional here so the exact
  // same schema/object shape validates both plans.
  dashboardAccessConsent: z.boolean().optional(),
});

function crossFieldRefine(values: z.infer<typeof plusBusinessRegistrationObjectSchema>, ctx: z.RefinementCtx) {
  if (values.addressType !== "service-area" && !values.address) {
    ctx.addIssue({ code: "custom", path: ["address"], message: "יש להזין כתובת" });
  }
  if (values.addressType !== "physical" && !values.serviceArea) {
    ctx.addIssue({ code: "custom", path: ["serviceArea"], message: "יש להזין אזור שירות" });
  }
  if (values.planId === "plus" && values.trialConsent !== true) {
    ctx.addIssue({ code: "custom", path: ["trialConsent"], message: "יש לאשר את הפעלת חודש הניסיון" });
  }
  if (values.planId === "premium" && values.dashboardAccessConsent !== true) {
    ctx.addIssue({
      code: "custom",
      path: ["dashboardAccessConsent"],
      message: "יש לאשר קבלת גישה מאובטחת לאזור האישי במייל",
    });
  }
}

/** Full schema — the server's single source of truth (actions.ts), and used by the wizard's own final full-form check before it ever calls the server. */
export const plusBusinessRegistrationSchema = plusBusinessRegistrationObjectSchema.superRefine(crossFieldRefine);

export type PlusRegistrationFormValues = z.infer<typeof plusBusinessRegistrationSchema>;

// ---- Per-step schemas, all derived from plusBusinessRegistrationObjectSchema above (`.pick()`),
// so a step's validation rules can never drift from the full/server schema's rules. Only the
// address/serviceArea cross-field pair from crossFieldRefine is re-applied at step 1 — everything
// else here is a plain pick, no re-implemented rules. ----

export const plusStepOneSchema = plusBusinessRegistrationObjectSchema
  .pick({
    businessName: true,
    categoryIds: true,
    businessType: true,
    contactName: true,
    contactPhone: true,
    contactEmail: true,
    addressType: true,
    address: true,
    serviceArea: true,
  })
  .superRefine((values, ctx) => {
    if (values.addressType !== "service-area" && !values.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "יש להזין כתובת" });
    }
    if (values.addressType !== "physical" && !values.serviceArea) {
      ctx.addIssue({ code: "custom", path: ["serviceArea"], message: "יש להזין אזור שירות" });
    }
  });

export const plusStepTwoSchema = plusBusinessRegistrationObjectSchema.pick({
  coverImage: true,
  shortDescription: true,
  fullDescription: true,
});

/** Just the array-level rules (min/max count) — each service's own fields are checked per-item via `serviceSchema` directly, for index-specific messages. */
export const plusStepThreeSchema = plusBusinessRegistrationObjectSchema.pick({ services: true });

export const plusStepFourSchema = plusBusinessRegistrationObjectSchema.pick({
  publicPhone: true,
  publicWhatsapp: true,
  publicEmail: true,
  websiteUrl: true,
  instagramUrl: true,
  facebookUrl: true,
  tiktokUrl: true,
});

export function plusStepFiveSchema(planId: "plus" | "premium") {
  const base = plusBusinessRegistrationObjectSchema.pick({ publicationConsent: true, termsAccepted: true, trialConsent: true, dashboardAccessConsent: true });
  return base.superRefine((values, ctx) => {
    if (planId === "plus" && values.trialConsent !== true) {
      ctx.addIssue({ code: "custom", path: ["trialConsent"], message: "יש לאשר את הפעלת חודש הניסיון" });
    }
    if (planId === "premium" && values.dashboardAccessConsent !== true) {
      ctx.addIssue({ code: "custom", path: ["dashboardAccessConsent"], message: "יש לאשר קבלת גישה מאובטחת לאזור האישי במייל" });
    }
  });
}
