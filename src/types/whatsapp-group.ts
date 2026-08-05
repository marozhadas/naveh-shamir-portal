export type WhatsAppGroupCategory =
  | "general"
  | "parents"
  | "children"
  | "women"
  | "men"
  | "families"
  | "marketplace"
  | "events"
  | "security"
  | "education"
  | "sports"
  | "volunteering"
  | "building"
  | "street"
  | "other";

export type WhatsAppGroupStatus = "draft" | "published" | "archived";

export type WhatsAppGroupIconType = "whatsapp" | "lucide" | "custom-image";

export const WHATSAPP_GROUP_CATEGORY_OPTIONS: WhatsAppGroupCategory[] = [
  "general",
  "parents",
  "children",
  "women",
  "men",
  "families",
  "marketplace",
  "events",
  "security",
  "education",
  "sports",
  "volunteering",
  "building",
  "street",
  "other",
];

export const WHATSAPP_GROUP_CATEGORY_LABEL: Record<WhatsAppGroupCategory, string> = {
  general: "כללי",
  parents: "הורים",
  children: "ילדים",
  women: "נשים",
  men: "גברים",
  families: "משפחות",
  marketplace: "מסירה ומכירה",
  events: "אירועים",
  security: "ביטחון",
  education: "חינוך",
  sports: "ספורט",
  volunteering: "התנדבות",
  building: "בניינים",
  street: "רחובות",
  other: "אחר",
};

export const WHATSAPP_GROUP_STATUS_LABEL: Record<WhatsAppGroupStatus, string> = {
  draft: "טיוטה",
  published: "מפורסם",
  archived: "בארכיון",
};

/** Mirrors the public.neighborhood_whatsapp_groups table (see the create_neighborhood_whatsapp_groups_table migration). */
export type WhatsAppGroupRow = {
  id: string;
  name: string;
  description: string | null;
  invite_url: string;
  category: WhatsAppGroupCategory;
  audience: string[];
  area_or_street: string | null;
  icon_type: WhatsAppGroupIconType;
  icon_name: string | null;
  icon_url: string | null;
  icon_alt: string | null;
  rules_or_notes: string | null;
  admin_contact_name: string | null;
  priority: number;
  featured: boolean;
  status: WhatsAppGroupStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};
