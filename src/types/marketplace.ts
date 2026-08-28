export type MarketplaceListingType = "giveaway" | "sale";

export type MarketplaceListingStatus = "pending" | "active" | "reserved" | "delivered" | "sold" | "removed";

export type MarketplaceListingImage = { src: string; alt: string };

export type MarketplaceListingRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  listing_type: MarketplaceListingType;
  category_id: string;
  price: number | null;
  is_free: boolean;
  condition: string | null;
  images: MarketplaceListingImage[];
  area: string | null;
  contact_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
  status: MarketplaceListingStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  report_count: number;
  created_at: string;
  updated_at: string;
  /**
   * SHA-256 hash of the poster's secret management link token — never the raw token itself (see
   * src/utils/marketplace-management-token.ts). Safe to read alongside the rest of the row (a
   * hash isn't the secret), but the raw token it was derived from must never be persisted
   * anywhere, logged, or sent to analytics.
   */
  management_token_hash: string | null;
  management_token_created_at: string | null;
  management_token_last_used_at: string | null;
};

export const MARKETPLACE_STATUS_LABEL: Record<MarketplaceListingStatus, string> = {
  pending: "ממתינה לאישור",
  active: "פעילה",
  reserved: "שמורה",
  delivered: "נמסרה",
  sold: "נמכרה",
  removed: "הוסרה",
};

export const MARKETPLACE_CONDITION_LABEL: Record<string, string> = {
  new: "חדש",
  "like-new": "כמו חדש",
  used: "משומש",
};
