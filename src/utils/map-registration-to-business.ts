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

function toLegacyCategory(categoryId: string): BusinessCategory {
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
  return {
    id: toBusinessId(row.id),
    slug: row.slug,
    name: row.business_name,
    category: toLegacyCategory(row.category_id),
    description: row.description,
    imageUrl: "",
    imageAlt: "",
    phone: row.phone ?? undefined,
    whatsappUrl: buildWhatsappUrl(row.whatsapp_phone),
    categoryIds: [row.category_id],
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
    contact: {
      phone: row.phone ?? undefined,
      whatsappUrl: buildWhatsappUrl(row.whatsapp_phone),
      email: row.email ?? undefined,
      websiteUrl: row.website_url ?? undefined,
    },
    location: {
      neighborhood: "נווה שמיר",
      address: row.address ?? undefined,
      serviceArea: row.service_area ?? undefined,
    },
  };
}
