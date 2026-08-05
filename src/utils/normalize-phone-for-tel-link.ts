/**
 * Strips everything a `tel:` link can't handle (spaces, dashes, parentheses) while preserving a
 * leading `+` for international numbers — so a short municipal number ("106") and a full
 * international one ("+972-2-999-9999") both resolve correctly on mobile and desktop dialers.
 */
export function normalizePhoneForTelLink(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}
