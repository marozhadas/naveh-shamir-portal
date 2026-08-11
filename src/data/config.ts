export const SITE_CONFIG = {
  name: "נווה שמיר — הפורטל של השכונה",
  whatsappCommunityUrl: "https://chat.whatsapp.com/nevesh-community-placeholder",
  designCredit: "עיצוב ופיתוח: הדס מרוז",
  /** The live production domain — used to build absolute URLs for metadata/JSON-LD/canonical/Open Graph (e.g. a business profile's clean slug URL). */
  siteUrl: "https://naveh-shamir-portal.vercel.app",
};

/** The portal's own contact details (/contact page) — not to be confused with EMERGENCY_NUMBERS or the neighborhood WhatsApp group above. */
export const CONTACT_INFO = {
  whatsappDisplay: "054-521-8644",
  whatsappUrl: "https://wa.me/972545218644",
  email: "marozhadas@gmail.com",
  emailUrl: "mailto:marozhadas@gmail.com",
};

export type EmergencyNumber = {
  id: string;
  label: string;
  number: string;
};

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { id: "municipality", label: "מוקד עירייה", number: "106" },
  { id: "police", label: "משטרה", number: "100" },
  { id: "mda", label: 'מד"א', number: "101" },
];

export type FooterLink = {
  id: string;
  label: string;
  href: string;
};

export const FOOTER_LEGAL_LINKS: FooterLink[] = [
  { id: "privacy", label: "מדיניות פרטיות", href: "/privacy" },
  { id: "terms", label: "תנאי שימוש", href: "/terms" },
  { id: "accessibility", label: "הצהרת נגישות", href: "/accessibility" },
];
