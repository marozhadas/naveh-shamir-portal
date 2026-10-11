const ALLOWED_WHATSAPP_HOSTS = new Set(["chat.whatsapp.com", "wa.me", "api.whatsapp.com"]);

/**
 * True for a stand-in invite link (e.g. the "...-placeholder" default in SITE_CONFIG.whatsappCommunityUrl) that was never
 * replaced with a real WhatsApp group link. Such a link must not be shown to visitors: it leads to WhatsApp's "invite link
 * is invalid" screen.
 */
export function isPlaceholderWhatsAppUrl(value: string): boolean {
  return /placeholder/i.test(value);
}

/**
 * A group invite link must be an actual WhatsApp URL — https only, on one of WhatsApp's own
 * domains. Rejects everything else (javascript:, other domains, malformed URLs) so an admin can
 * never accidentally (or maliciously) store a link that isn't really WhatsApp.
 */
export function isValidWhatsAppGroupUrl(value: string): boolean {
  if (!value) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return ALLOWED_WHATSAPP_HOSTS.has(parsed.hostname);
}
