import { z } from "zod";

/** English-only, lowercase, hyphen-separated — no spaces, no underscores, no leading/trailing/double hyphens. Hebrew (or any non a-z0-9) never matches. */
export const BUSINESS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const BUSINESS_SLUG_INVALID_MESSAGE = "יש להזין כתובת באנגלית בלבד, באותיות קטנות ובמקפים במקום רווחים.";

export const businessSlugSchema = z
  .string()
  .trim()
  .min(1, "יש להזין כתובת URL")
  .max(120, "הכתובת ארוכה מדי — עד 120 תווים")
  .regex(BUSINESS_SLUG_PATTERN, BUSINESS_SLUG_INVALID_MESSAGE);

/** Whether an existing slug value (e.g. one auto-generated from a Hebrew business name at registration) already qualifies as a clean, publishable English URL — the gate changeBusinessPlanAction / startRealBusinessTrial check before going live. */
export function isValidBusinessSlug(slug: string): boolean {
  return BUSINESS_SLUG_PATTERN.test(slug);
}

/**
 * Cleans up an already-English string into a slug — NOT a Hebrew transliteration (no reliable
 * transliteration library exists in this project; spec section 3 explicitly says not to build one
 * without one already available, and to prefer the admin typing the English slug by hand). Useful
 * only when the business name itself happens to already be in English (e.g. "Roni's Kitchen");
 * for a Hebrew name this returns "" and the caller should not offer the suggestion at all.
 */
export function suggestSlugFromEnglishName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
