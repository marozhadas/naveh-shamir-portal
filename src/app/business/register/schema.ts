import { z } from "zod";
import { BUSINESS_CATEGORIES } from "@/data/business-categories";
import { isSafeHrefOrEmpty } from "@/utils/validate-href";

/**
 * Mirrors the fields the registration form actually collects today (see business-registration.ts
 * for the DB row shape). Deliberately does NOT add categoryIds/openingHours/services/instagramUrl/
 * termsAccepted/image-upload — none of those exist in this form or in business_registrations, and
 * adding them would mean a schema migration this fix doesn't need.
 */
export type BusinessRegistrationFormValues = {
  businessName: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  contactName: string;
  phone: string;
  whatsappPhone: string;
  email: string;
  websiteUrl: string;
  address: string;
  serviceArea: string;
};

export const EMPTY_FORM_VALUES: BusinessRegistrationFormValues = {
  businessName: "",
  categoryId: "",
  shortDescription: "",
  description: "",
  contactName: "",
  phone: "",
  whatsappPhone: "",
  email: "",
  websiteUrl: "",
  address: "",
  serviceArea: "",
};

/** DOM/visual order of the fields — used to focus the first invalid field after a failed submit. */
export const FIELD_ORDER: (keyof BusinessRegistrationFormValues)[] = [
  "businessName",
  "categoryId",
  "shortDescription",
  "description",
  "contactName",
  "phone",
  "whatsappPhone",
  "email",
  "websiteUrl",
  "address",
  "serviceArea",
];

const PHONE_PATTERN = /^\+?[0-9-\s]{6,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AT_LEAST_ONE_CONTACT_METHOD_MESSAGE = "יש להזין לפחות דרך התקשרות אחת (טלפון, וואטסאפ או אימייל)";

export const businessRegistrationSchema = z
  .object({
    businessName: z.string().trim().min(1, "יש להזין שם עסק").max(120, "שם העסק ארוך מדי — עד 120 תווים"),
    categoryId: z.string().refine((value) => BUSINESS_CATEGORIES.some((category) => category.id === value), {
      message: "יש לבחור קטגוריה מהרשימה",
    }),
    shortDescription: z.string().trim().max(140, "התיאור הקצר ארוך מדי — עד 140 תווים"),
    description: z.string().trim().min(1, "יש להוסיף תיאור לעסק").max(800, "התיאור ארוך מדי — עד 800 תווים"),
    contactName: z.string().trim().min(1, "יש להזין שם איש/אשת קשר").max(120, "השם ארוך מדי — עד 120 תווים"),
    phone: z.string().trim().refine((value) => !value || PHONE_PATTERN.test(value), { message: "מספר הטלפון אינו תקין" }),
    whatsappPhone: z.string().trim().refine((value) => !value || PHONE_PATTERN.test(value), { message: "מספר הוואטסאפ אינו תקין" }),
    email: z.string().trim().refine((value) => !value || EMAIL_PATTERN.test(value), { message: "כתובת המייל אינה תקינה" }),
    websiteUrl: z.string().trim().refine((value) => !value || isSafeHrefOrEmpty(value), {
      message: "כתובת האתר אינה תקינה — יש להשתמש בקישור https://",
    }),
    address: z.string().trim(),
    serviceArea: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (!values.phone && !values.whatsappPhone && !values.email) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: AT_LEAST_ONE_CONTACT_METHOD_MESSAGE });
      ctx.addIssue({ code: "custom", path: ["whatsappPhone"], message: AT_LEAST_ONE_CONTACT_METHOD_MESSAGE });
      ctx.addIssue({ code: "custom", path: ["email"], message: AT_LEAST_ONE_CONTACT_METHOD_MESSAGE });
    }
  });

/** The first field (in DOM order) that has an error — used to move focus there after a failed submit. */
export function firstInvalidField(
  fieldErrors: Partial<Record<keyof BusinessRegistrationFormValues, string[]>> | undefined,
): keyof BusinessRegistrationFormValues | null {
  if (!fieldErrors) return null;
  return FIELD_ORDER.find((field) => (fieldErrors[field]?.length ?? 0) > 0) ?? null;
}
