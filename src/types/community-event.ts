export type EventAudience = "children" | "women" | "men" | "family";

export type EventStatus = "draft" | "published" | "canceled" | "archived";

export const EVENT_AUDIENCE_OPTIONS: EventAudience[] = ["children", "women", "men", "family"];

export const EVENT_AUDIENCE_LABEL: Record<EventAudience, string> = {
  children: "ילדים",
  women: "נשים",
  men: "גברים",
  family: "משפחה",
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "טיוטה",
  published: "פורסם",
  canceled: "בוטל",
  archived: "בארכיון",
};

/** The `events` table row shape (Supabase) — mirrors the spec's CommunityEvent type. */
export type CommunityEventRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  audience: EventAudience[];
  category: string | null;
  event_date: string; // YYYY-MM-DD (real `date` column, never embedded in free text)
  start_time: string; // HH:MM:SS
  end_time: string | null;
  location_name: string;
  address: string | null;
  image_url: string | null;
  image_alt: string | null;
  is_free: boolean;
  price_text: string | null;
  registration_url: string | null;
  contact_phone: string | null;
  whatsapp: string | null;
  status: EventStatus;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};
