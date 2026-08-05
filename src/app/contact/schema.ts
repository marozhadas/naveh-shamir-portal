import { z } from "zod";
import { CONTACT_MESSAGE_SUBJECT_TYPE_OPTIONS } from "@/types/contact-message";

const PHONE_PATTERN = /^\+?[0-9-\s()]{6,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 20;

export type ContactFormValues = {
  fullName: string;
  email: string;
  whatsapp: string;
  subjectType: string;
  subject: string;
  message: string;
  consentAccepted: boolean;
  /** Hidden field real visitors never fill; a bot that fills every field usually does. */
  honeypot: string;
};

export const EMPTY_CONTACT_FORM_VALUES: ContactFormValues = {
  fullName: "",
  email: "",
  whatsapp: "",
  subjectType: "",
  subject: "",
  message: "",
  consentAccepted: false,
  honeypot: "",
};

/** DOM/visual order of the fields — used to focus the first invalid field after a failed submit. */
export const FIELD_ORDER: (keyof ContactFormValues)[] = ["fullName", "email", "whatsapp", "subjectType", "subject", "message", "consentAccepted"];

export const contactFormSchema = z.object({
  fullName: z.string().trim().min(1, "יש להזין שם מלא").max(120, "השם ארוך מדי — עד 120 תווים"),
  email: z
    .string()
    .trim()
    .min(1, "יש להזין כתובת מייל")
    .refine((value) => EMAIL_PATTERN.test(value), { message: "כתובת המייל אינה תקינה" }),
  whatsapp: z.string().trim().refine((value) => !value || PHONE_PATTERN.test(value), { message: "מספר הוואטסאפ אינו תקין" }),
  subjectType: z.enum(CONTACT_MESSAGE_SUBJECT_TYPE_OPTIONS as [string, ...string[]], { message: "יש לבחור נושא לפנייה" }),
  subject: z.string().trim().min(1, "יש להזין כותרת לפנייה").max(140, "הכותרת ארוכה מדי — עד 140 תווים"),
  message: z
    .string()
    .trim()
    .min(MIN_MESSAGE_LENGTH, `יש להזין הודעה מפורטת יותר — לפחות ${MIN_MESSAGE_LENGTH} תווים`)
    .max(3000, "ההודעה ארוכה מדי — עד 3000 תווים"),
  // z.literal(true, { message }) silently drops the custom message in this Zod version (falls back
  // to the raw "Invalid literal value, expected true") — z.boolean().refine() reliably keeps ours.
  consentAccepted: z.boolean().refine((v) => v === true, { message: "יש לאשר שניתן ליצור איתך קשר כדי לשלוח את הפנייה" }),
  honeypot: z.string().max(0).optional(),
});

/** The first field (in DOM order) that has an error — used to move focus there after a failed submit. */
export function firstInvalidField(fieldErrors: Partial<Record<keyof ContactFormValues, string[]>> | undefined): keyof ContactFormValues | null {
  if (!fieldErrors) return null;
  return FIELD_ORDER.find((field) => (fieldErrors[field]?.length ?? 0) > 0) ?? null;
}
