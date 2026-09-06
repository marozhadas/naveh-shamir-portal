import { WEEKDAYS } from "@/app/business/register/plus/schema";
import type { BusinessManagementEditValues } from "./schema";
import type { BusinessRegistrationRow } from "@/types/business-registration";

/** Same default a fresh registration would have for a day with no hours yet — closed on Saturday, 09:00–18:00 the rest, matching PlusRegistrationWizard's createEmptyHours default. */
export function createDefaultOpeningHours(): BusinessManagementEditValues["openingHours"] {
  return WEEKDAYS.map((day) => ({
    day,
    closed: day === "saturday",
    intervals: day === "saturday" ? [] : [{ opensAt: "09:00", closesAt: "18:00" }],
  }));
}

/** Maps a stored registration row (snake_case, nullable) into the edit form's shape (camelCase, defaulted) — the exact inverse of what updateManagedBusinessFields writes back. */
export function mapRegistrationToManagementValues(registration: BusinessRegistrationRow): BusinessManagementEditValues {
  return {
    businessName: registration.business_name,
    categoryIds: registration.category_ids && registration.category_ids.length > 0 ? registration.category_ids : [registration.category_id],
    businessType: registration.business_type ?? "",
    publicPhone: registration.public_phone ?? "",
    publicWhatsapp: registration.public_whatsapp ?? "",
    publicEmail: registration.public_email ?? "",
    shortDescription: registration.short_description ?? "",
    fullDescription: registration.description,
    addressType: registration.address_type ?? "physical",
    address: registration.address ?? "",
    serviceArea: registration.service_area ?? "",
    coverImage: registration.cover_image ?? { url: "", alt: "" },
    gallery: registration.gallery ?? [],
    services: registration.services && registration.services.length > 0 ? registration.services : [{ title: "", description: "", priceLabel: "" }],
    testimonials: registration.testimonials ?? [],
    openingHours: registration.opening_hours && registration.opening_hours.length === 7 ? registration.opening_hours : createDefaultOpeningHours(),
    websiteUrl: registration.website_url ?? "",
    instagramUrl: registration.social_links?.instagramUrl ?? "",
    facebookUrl: registration.social_links?.facebookUrl ?? "",
    tiktokUrl: registration.social_links?.tiktokUrl ?? "",
    promotion: registration.promotion ?? null,
  };
}
