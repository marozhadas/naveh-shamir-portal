import type { Business, BusinessContact } from "@/types/business";

/**
 * Resolves the richer profile-page fields against their flat archive-page equivalents (see the
 * long comment on `Business` in src/types/business.ts for why both exist). Every profile-page
 * component should read business data through these helpers rather than picking individual
 * fields directly, so the fallback logic lives in exactly one place.
 */
export function getBusinessHeroImage(business: Business): { src: string; alt: string } {
  if (business.image?.src) return business.image;
  return { src: business.imageUrl, alt: business.imageAlt };
}

export function getBusinessContact(business: Business): BusinessContact {
  return {
    phone: business.contact?.phone ?? business.phone,
    whatsappUrl: business.contact?.whatsappUrl ?? business.whatsappUrl,
    email: business.contact?.email,
    websiteUrl: business.contact?.websiteUrl ?? business.websiteUrl,
  };
}

export function getBusinessAddressLine(business: Business): string | undefined {
  return business.location?.address ?? business.address;
}

export function getBusinessServiceArea(business: Business): string | undefined {
  return business.location?.serviceArea ?? business.serviceArea;
}

export function getBusinessDescription(business: Business): string {
  return business.fullDescription || business.description;
}
