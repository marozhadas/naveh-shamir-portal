import { z } from "zod";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FEEDBACK_KINDS = ["idea", "bug", "praise", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  idea: "רעיון או הצעה",
  bug: "תקלה באתר",
  praise: "מחמאה",
  other: "אחר",
};

export const MIN_FEEDBACK_LENGTH = 10;
export const MAX_FEEDBACK_LENGTH = 2000;

export const feedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS, { message: "יש לבחור סוג משוב" }),
  message: z
    .string()
    .trim()
    .min(MIN_FEEDBACK_LENGTH, `יש לכתוב לפחות ${MIN_FEEDBACK_LENGTH} תווים`)
    .max(MAX_FEEDBACK_LENGTH, `המשוב ארוך מדי — עד ${MAX_FEEDBACK_LENGTH} תווים`),
  name: z.string().trim().max(120, "השם ארוך מדי — עד 120 תווים"),
  email: z
    .string()
    .trim()
    .max(200, "כתובת המייל ארוכה מדי")
    .refine((value) => !value || EMAIL_PATTERN.test(value), { message: "כתובת המייל אינה תקינה" }),
});

/** Only a same-site path is ever stored — never a full URL, query string or hash (which could carry tokens). */
export function normalizePagePath(raw: string): string | null {
  const path = raw.split(/[?#]/)[0].trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 300) return null;
  return path;
}
