/**
 * Builds a URL-safe slug from arbitrary text (typically a business name, which is usually
 * Hebrew — Hebrew letters aren't stripped, so a Hebrew name still produces a readable slug).
 * `disambiguator` (e.g. a short random suffix) is appended when the caller already knows the
 * base slug might collide with an existing row.
 */
export function slugify(text: string, disambiguator?: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  const safeBase = base || "business";
  return disambiguator ? `${safeBase}-${disambiguator}` : safeBase;
}
