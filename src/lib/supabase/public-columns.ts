/**
 * The explicit column whitelists for everything the PUBLIC (anon) Supabase client may read. They
 * mirror, one to one, what the database itself allows the anon role to see (column-level GRANTs and
 * the public_business_listings view — see the "public_read_whitelists" migrations), so there is no
 * `select("*")` anywhere on the public side: asking for a column outside these lists is refused by
 * Postgres, not merely hidden by the frontend.
 *
 * Internal columns (admin ids, rejection reasons, management-link hashes, counters, owner/billing
 * fields, ...) are deliberately absent. When a consumer's row type still declares such a column, the
 * repository fills it with a neutral value (null / 0) via the helpers below — the data is simply
 * never fetched.
 */

import type { BusinessRegistrationRow } from "@/types/business-registration";
import type { CommunityEventRow } from "@/types/community-event";
import type { CommunityNewsRow } from "@/types/community-news";
import type { EssentialNumberRow } from "@/types/essential-number";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";
import type { MarketplaceListingRow } from "@/types/marketplace";
import type { BusinessReviewRow } from "@/types/business-review";

// ── Businesses (read through the public_business_listings view, never the base table) ────────────

export const PUBLIC_BUSINESS_COLUMNS =
  "id, slug, business_name, category_id, category_ids, business_type, description, short_description, website_url, address, service_area, address_type, featured, verified, created_at, reviewed_at, plan_tier, active_plan_id, public_phone, public_whatsapp, public_email, cover_image, gallery, services, opening_hours, social_links, promotion, testimonials, status" as const;

export type PublicBusinessRow = Pick<
  BusinessRegistrationRow,
  | "id"
  | "slug"
  | "business_name"
  | "category_id"
  | "category_ids"
  | "business_type"
  | "description"
  | "short_description"
  | "website_url"
  | "address"
  | "service_area"
  | "address_type"
  | "featured"
  | "verified"
  | "created_at"
  | "reviewed_at"
  | "plan_tier"
  | "active_plan_id"
  | "public_phone"
  | "public_whatsapp"
  | "public_email"
  | "cover_image"
  | "gallery"
  | "services"
  | "opening_hours"
  | "social_links"
  | "promotion"
  | "testimonials"
  | "status"
>;

// ── Events ────────────────────────────────────────────────────────────────────────────────────────

export const PUBLIC_EVENT_COLUMNS =
  "id, title, slug, short_description, full_description, audience, category, event_date, start_time, end_time, location_name, address, image_url, image_alt, is_free, price_text, registration_url, contact_phone, whatsapp, status, featured, display_order, created_at, updated_at, published_at" as const;

export function toPublicEventRow<T extends Omit<CommunityEventRow, "created_by" | "updated_by">>(row: T): CommunityEventRow {
  return { ...row, created_by: null, updated_by: null };
}

// ── News ──────────────────────────────────────────────────────────────────────────────────────────

export const PUBLIC_NEWS_COLUMNS =
  "id, title, slug, excerpt, body, image_url, image_alt, status, display_order, created_at, updated_at, published_at" as const;

export function toPublicNewsRow<T extends Omit<CommunityNewsRow, "created_by" | "updated_by">>(row: T): CommunityNewsRow {
  return { ...row, created_by: null, updated_by: null };
}

// ── Essential numbers ─────────────────────────────────────────────────────────────────────────────

export const PUBLIC_ESSENTIAL_NUMBER_COLUMNS =
  "id, name, description, phone, display_phone, whatsapp, website_url, category, icon_type, icon_name, icon_url, icon_alt, icon_tone, opening_hours, notes, priority, featured, status, created_at, updated_at" as const;

export function toPublicEssentialNumberRow<T extends Omit<EssentialNumberRow, "created_by" | "updated_by">>(row: T): EssentialNumberRow {
  return { ...row, created_by: null, updated_by: null };
}

// ── WhatsApp groups ───────────────────────────────────────────────────────────────────────────────

export const PUBLIC_WHATSAPP_GROUP_COLUMNS =
  "id, name, description, invite_url, category, audience, area_or_street, icon_type, icon_name, icon_url, icon_alt, rules_or_notes, priority, featured, status, created_at, updated_at" as const;

/** admin_contact_name is the group admin's personal name — admin-only, never public. */
export function toPublicWhatsAppGroupRow<T extends Omit<WhatsAppGroupRow, "admin_contact_name" | "created_by" | "updated_by">>(row: T): WhatsAppGroupRow {
  return { ...row, admin_contact_name: null, created_by: null, updated_by: null };
}

// ── Marketplace ───────────────────────────────────────────────────────────────────────────────────

export const PUBLIC_MARKETPLACE_COLUMNS =
  "id, slug, title, description, listing_type, category_id, price, is_free, condition, images, area, contact_name, phone, whatsapp_phone, status, created_at, updated_at" as const;

/** Never fetched publicly: management_token_hash (+ its timestamps), rejection_reason, reviewed_at, report_count. */
export function toPublicMarketplaceRow<
  T extends Omit<MarketplaceListingRow, "rejection_reason" | "reviewed_at" | "report_count" | "management_token_hash" | "management_token_created_at" | "management_token_last_used_at">,
>(row: T): MarketplaceListingRow {
  return {
    ...row,
    rejection_reason: null,
    reviewed_at: null,
    report_count: 0,
    management_token_hash: null,
    management_token_created_at: null,
    management_token_last_used_at: null,
  };
}

// ── Business reviews ──────────────────────────────────────────────────────────────────────────────

export const PUBLIC_REVIEW_COLUMNS = "id, business_id, author_name, content, status, created_at" as const;

export function toPublicReviewRow<T extends Omit<BusinessReviewRow, "rejection_reason" | "reviewed_at">>(row: T): BusinessReviewRow {
  return { ...row, rejection_reason: null, reviewed_at: null };
}
