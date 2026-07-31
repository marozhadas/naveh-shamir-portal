/**
 * Shared safety check for any user-editable URL/href across the editor
 * (nav items, footer links, business/event/whatsapp URLs). Allows the link
 * shapes the site actually uses; rejects everything that could execute code
 * or leak a data blob into an href.
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

/** Same rule, but an empty string is allowed (for optional/placeholder links not yet set). */
export function isSafeHrefOrEmpty(value: string): boolean {
  return value === "" || isSafeHref(value);
}
