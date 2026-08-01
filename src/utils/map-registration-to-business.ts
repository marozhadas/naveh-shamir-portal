import type { Business, BusinessCategory } from "@/types/business";
import type { BusinessRegistrationRow } from "@/types/business-registration";

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

/** Only ever called with an approved row — the caller (business repository) is responsible for that filter. */
export function mapRegistrationToBusiness(row: BusinessRegistrationRow): Business {
  return {
    id: `reg-${row.id}`,
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
    status: "published",
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
