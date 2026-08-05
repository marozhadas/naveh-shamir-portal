/**
 * Normalizes a phone number (as typed by an Israeli resident, e.g. "054-521-8644") into the
 * digits-only, country-code-prefixed form wa.me requires (e.g. "972545218644") — no "+", no
 * leading "0". A local number's leading 0 is replaced with Israel's country code 972; a number
 * already given in international form (leading "+972…" or "972…") is left as-is (just stripped of
 * separators). Returns an empty string for input with no digits at all.
 */
export function normalizePhoneForWhatsAppLink(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}
