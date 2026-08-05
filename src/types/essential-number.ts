export type EssentialNumberCategory = "emergency" | "medical" | "municipality" | "security" | "education" | "community" | "transportation" | "utilities" | "other";

export type EssentialNumberStatus = "draft" | "published" | "archived";

export type EssentialNumberIconTone = "blue" | "green" | "orange" | "red" | "purple" | "gray";

export const ESSENTIAL_NUMBER_CATEGORY_OPTIONS: EssentialNumberCategory[] = [
  "emergency",
  "medical",
  "municipality",
  "security",
  "education",
  "community",
  "transportation",
  "utilities",
  "other",
];

export const ESSENTIAL_NUMBER_CATEGORY_LABEL: Record<EssentialNumberCategory, string> = {
  emergency: "חירום",
  medical: "רפואה",
  municipality: "עירייה",
  security: "ביטחון",
  education: "חינוך",
  community: "קהילה",
  transportation: "תחבורה",
  utilities: "תשתיות",
  other: "אחר",
};

export const ESSENTIAL_NUMBER_STATUS_LABEL: Record<EssentialNumberStatus, string> = {
  draft: "טיוטה",
  published: "מפורסם",
  archived: "בארכיון",
};

export const ESSENTIAL_NUMBER_ICON_TONE_OPTIONS: EssentialNumberIconTone[] = ["blue", "green", "orange", "red", "purple", "gray"];

export const ESSENTIAL_NUMBER_ICON_TONE_LABEL: Record<EssentialNumberIconTone, string> = {
  blue: "כחול",
  green: "ירוק",
  orange: "כתום",
  red: "אדום",
  purple: "סגול",
  gray: "אפור",
};

/** Mirrors the public.essential_numbers table (see the "create_essential_numbers_table" migration). */
export type EssentialNumberRow = {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  display_phone: string;
  whatsapp: string | null;
  website_url: string | null;
  category: EssentialNumberCategory;
  icon_type: "lucide" | "custom-image";
  icon_name: string | null;
  icon_url: string | null;
  icon_alt: string | null;
  icon_tone: EssentialNumberIconTone;
  opening_hours: string | null;
  notes: string | null;
  priority: number;
  featured: boolean;
  status: EssentialNumberStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};
