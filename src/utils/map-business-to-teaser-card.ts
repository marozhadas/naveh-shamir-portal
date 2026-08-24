import { toLegacyCategory } from "./map-registration-to-business";
import { createWhatsappLink } from "./create-whatsapp-link";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import type { BusinessCardContentSettings } from "@/editor/schemas/businesses.schema";

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function toTelHref(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function toWhatsappHref(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return createWhatsappLink(`https://wa.me/${digits}`);
}

/**
 * Maps a real, admin-featured business_registrations row into the shape the editor-authored
 * `FeaturedBusinessesSection` expects for a single card. Like map-community-events-to-teaser-
 * cards.ts, this is a plain runtime object (not validated through businessCardContentSchema) —
 * string fields are defensively truncated to the editor's own limits.
 *
 * `cardUrl` is only set when the business actually has a public profile page (Plus/Premium with
 * active access) — a basic-tier or lapsed business still shows its card (admin chose to feature
 * it) but with a non-clickable name, exactly like BusinessCard.tsx already renders a card with no
 * cardUrl, rather than linking to a page that would show "not available".
 *
 * `whatsappUrl` is likewise gated on `canOpenProfile` — a basic-tier business gets a phone
 * number only, never a WhatsApp button, same as the archive's own BusinessCard.tsx ("אין להציג
 * כפתור WhatsApp כלל" for basic; a deliberate upgrade incentive, not an oversight). The two
 * gates share the exact same underlying signal since canOpenProfile is only ever true for
 * Plus/Premium — see getBusinessListingAccess.
 */
export function mapBusinessToTeaserCard(row: BusinessRegistrationRow, canOpenProfile: boolean): BusinessCardContentSettings {
  return {
    id: row.id,
    slug: row.slug,
    name: truncate(row.business_name, CONTENT_LIMITS.cardTitle),
    category: toLegacyCategory(row.category_id),
    description: truncate(row.short_description || row.description, CONTENT_LIMITS.cardDescription),
    image: { src: row.cover_image?.url ?? "", alt: row.cover_image?.alt ?? row.business_name, objectFit: "cover" },
    callButtonLabel: "התקשרו",
    whatsappButtonLabel: "וואטסאפ",
    phone: toTelHref(row.public_phone || row.phone),
    whatsappUrl: canOpenProfile ? toWhatsappHref(row.public_whatsapp || row.whatsapp_phone) : "",
    cardUrl: canOpenProfile ? `/businesses/${row.slug}` : "",
    visible: true,
  };
}
