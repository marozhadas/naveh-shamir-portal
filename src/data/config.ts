export const SITE_CONFIG = {
  name: "נווה שמיר — הפורטל של השכונה",
  whatsappCommunityUrl: "https://chat.whatsapp.com/nevesh-community-placeholder",
  designCredit: "עיצוב ופיתוח: הדס מרוז",
  /** No real domain is deployed yet — used only to build absolute URLs for metadata/JSON-LD; swap for the real domain at launch. */
  siteUrl: "https://naveh-shamir-portal.example",
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
