/**
 * Site-side copy of the editor's own validate-href (src/editor/utils/validate-href.ts) — kept
 * separate on purpose, since site components must not depend on anything under src/editor/, even
 * a small dependency-free utility (same precedent as src/hooks/use-focus-trap.ts).
 */
export function isSafeHref(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
  if (lower.startsWith("https://")) return true;
  if (lower.startsWith("tel:") || lower.startsWith("mailto:")) return true;
  return false;
}

export function isSafeHrefOrEmpty(value: string): boolean {
  return value === "" || isSafeHref(value);
}
