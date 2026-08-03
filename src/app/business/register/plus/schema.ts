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

const mediaSchema = z.object({ url: z.string().min(1), alt: z.string().trim().max(200) });
const gallerySchema = mediaSchema.extend({ order: z.number().int().min(0) });

const serviceSchema = z.object({
  title: z.string().trim().min(1, "יש להזין שם שירות").max(120, "שם השירות ארוך מדי"),
  description: z.string().trim().max(300, "התיאור ארוך מדי").optional(),
  priceLabel: z.string().trim().max(60, "התווית ארוכה מדי").optional(),
});

const intervalSchema = z
  .object({
    opensAt: z.string().regex(TIME_PATTERN, "שעת פתיחה אינה תקינה"),
    closesAt: z.string().regex(TIME_PATTERN, "שעת סגירה אינה תקינה"),
  })
  .refine((value) => value.opensAt < value.closesAt, { message: "שעת הסגירה חייבת להיות אחרי שעת הפתיחה" });

const openingHoursDaySchema = z.object({
  day: z.enum(WEEKDAYS),
  closed: z.boolean(),
  intervals: z.array(intervalSchema).max(3, "יותר מדי טווחי שעות ליום אחד"),
});

const promotionSchema = z.object({
  title: z.string().trim().min(1, "יש להזין כותרת למבצע").max(120, "הכותרת ארוכה מדי"),
  description: z.string().trim().max(300, "התיאור ארוך מדי").optional(),
  validUntil: z.string().trim().optional(),
});

export const plusBusinessRegistrationSchema = z
  .object({
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

    publicationConsent: z.literal(true, { message: "יש לאשר את פרסום הפרטים" }),
    termsAccepted: z.literal(true, { message: "יש לאשר את תנאי השימוש" }),
    trialConsent: z.literal(true, { message: "יש לאשר את הפעלת חודש הניסיון" }),
  })
  .superRefine((values, ctx) => {
    if (values.addressType !== "service-area" && !values.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "יש להזין כתובת" });
    }
    if (values.addressType !== "physical" && !values.serviceArea) {
      ctx.addIssue({ code: "custom", path: ["serviceArea"], message: "יש להזין אזור שירות" });
    }
  });

export type PlusRegistrationFormValues = z.infer<typeof plusBusinessRegistrationSchema>;
