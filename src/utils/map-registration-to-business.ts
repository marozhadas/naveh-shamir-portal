import type { Business, BusinessCategory } from "@/types/business";
import type { BusinessPublicationStatus } from "@/types/business-status";
import type { BusinessRegistrationRow, BusinessRegistrationStatus } from "@/types/business-registration";
import { toBusinessId } from "@/utils/business-id";

/**
 * The registration form uses the archive's richer category taxonomy (src/data/business-categories.ts),
 * while the homepage's editor-curated cards still use the older 4-value BusinessCategory union
 * (see the long comment on `Business` in src/types/business.ts). This is a best-effort mapping
 * for that legacy required field — categoryIds (the archive taxonomy) is the field everything
 * that actually matters (archive filtering, category tag on the profile page) reads from.
 */
const ARCHIVE_CATEGORY_TO_LEGACY: Record<string, BusinessCategory> = {
  food: "אוכל",
  fitness: "חוגים",
  education: "חוגים",
  other: 'גמ"ח',
};

export function toLegacyCategory(categoryId: string): BusinessCategory {
  return ARCHIVE_CATEGORY_TO_LEGACY[categoryId] ?? "שירותים";
}

function buildWhatsappUrl(phone: string | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : undefined;
}

/**
 * Registration status and publication status are deliberately different vocabularies (admin
 * approval workflow vs. public-listing lifecycle) — this is the one place that translates between
 * them. "rejected" maps to "archived" (permanently not shown, distinct from a temporary
 * suspension) since there's no separate rejected-equivalent in BusinessPublicationStatus.
 */
const REGISTRATION_TO_PUBLICATION_STATUS: Record<BusinessRegistrationStatus, BusinessPublicationStatus> = {
  pending: "pending-review",
  approved: "published",
  rejected: "archived",
};

/**
 * Safe to call with a row of any status — the mapped `status` field reflects the real
 * registration status (not hardcoded to "published"), so getBusinessListingAccess() correctly
 * refuses archive/profile visibility for a still-pending or rejected registration even if a
 * caller forgets to pre-filter (e.g. the owner's own dashboard, which must show a pending
 * registration to its owner without exposing it publicly).
 */
export function mapRegistrationToBusiness(row: BusinessRegistrationRow): Business {
  const publicPhone = row.public_phone ?? row.phone;
  const publicWhatsapp = row.public_whatsapp ?? row.whatsapp_phone;

  return {
    id: toBusinessId(row.id),
    slug: row.slug,
    name: row.business_name,
    category: toLegacyCategory(row.category_id),
    description: row.description,
    imageUrl: row.cover_image?.url ?? "",
    imageAlt: row.cover_image?.alt ?? "",
    phone: publicPhone ?? undefined,
    whatsappUrl: buildWhatsappUrl(publicWhatsapp),
    categoryIds: row.category_ids ?? [row.category_id],
    shortDescription: row.short_description ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    address: row.address ?? undefined,
    serviceArea: row.service_area ?? undefined,
    featured: row.featured,
    verified: row.verified,
    visible: true,
    createdAt: row.created_at,
    status: REGISTRATION_TO_PUBLICATION_STATUS[row.status],
    ownerId: row.owner_id ?? undefined,
    fullDescription: row.description,
    image: row.cover_image ? { src: row.cover_image.url, alt: row.cover_image.alt } : undefined,
    gallery: row.gallery?.map((image, index) => ({ id: `${row.id}-gallery-${index}`, src: image.url, alt: image.alt, order: image.order })),
    contact: {
      phone: publicPhone ?? undefined,
      whatsappUrl: buildWhatsappUrl(publicWhatsapp),
      // The free flow's `email` has always been shown publicly (no separate internal/public
      // split exists for it) — `public_email` only applies to the Plus/Premium wizard, which
      // deliberately never defaults it from the internal contact email (privacy: spec section 8).
      email: row.public_email ?? row.email ?? undefined,
      websiteUrl: row.website_url ?? undefined,
    },
    location: {
      neighborhood: "נווה שמיר",
      address: row.address ?? undefined,
      serviceArea: row.service_area ?? undefined,
    },
    openingHours: row.opening_hours?.map((day) => ({ day: day.day, closed: day.closed, intervals: day.intervals })),
    services: row.services?.map((service, index) => ({
      id: `${row.id}-service-${index}`,
      name: service.title,
      description: service.description,
      priceLabel: service.priceLabel,
      visible: true,
      order: index,
    })),
    socialLinks: row.social_links
      ? { instagram: row.social_links.instagramUrl, facebook: row.social_links.facebookUrl, tiktok: row.social_links.tiktokUrl }
      : undefined,
    promotion: row.promotion ? { ...row.promotion, visible: true } : undefined,
  };
}
