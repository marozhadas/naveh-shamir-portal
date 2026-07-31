export const DEFAULT_WHATSAPP_MESSAGE = "היי, הגעתי אליכם דרך פורטל נווה שמיר ואשמח לקבל פרטים.";

/** A wa.me (or api.whatsapp.com) URL only — never accepts an arbitrary scheme. */
function isSafeWhatsappUrl(url: string): boolean {
  return url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/");
}

/**
 * Appends a pre-filled, `encodeURIComponent`-escaped message to a business's WhatsApp link.
 * Returns "" (never a broken link) when `whatsappUrl` isn't a recognized, safe WhatsApp URL.
 */
export function createWhatsappLink(whatsappUrl: string, message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  if (!whatsappUrl || !isSafeWhatsappUrl(whatsappUrl)) return "";
  const separator = whatsappUrl.includes("?") ? "&" : "?";
  return `${whatsappUrl}${separator}text=${encodeURIComponent(message)}`;
}
