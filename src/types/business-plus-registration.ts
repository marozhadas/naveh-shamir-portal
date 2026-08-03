export type BusinessMediaInput = { url: string; alt: string };

export type BusinessGalleryImageInput = BusinessMediaInput & { order: number };

export type BusinessServiceInput = {
  title: string;
  description?: string;
  priceLabel?: string;
};

export type BusinessOpeningHoursInterval = { opensAt: string; closesAt: string };

export type BusinessOpeningHoursInput = {
  day: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
  closed: boolean;
  intervals: BusinessOpeningHoursInterval[];
};

export type BusinessPromotionInput = {
  title: string;
  description?: string;
  validUntil?: string;
};

export type BusinessSocialLinksInput = {
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
};

/**
 * What the Plus (and, reusing the same shape, Premium) registration wizard collects — an
 * extension of the free flow's fields (businessRegistrationSchema in business/register/schema.ts),
 * never a parallel/disconnected model. `registrationId` is generated client-side at wizard start so
 * uploaded images can be stored under a stable folder before the row itself exists (see
 * business-media-service.ts), then reused as the actual business_registrations.id at submit time.
 */
export type PlusBusinessRegistrationInput = {
  registrationId: string;
  planId: "plus" | "premium";

  businessName: string;
  categoryIds: string[];
  businessType: string;

  contactName: string;
  contactPhone: string;
  contactEmail: string;

  publicPhone: string;
  publicWhatsapp: string;
  publicEmail: string;

  shortDescription: string;
  fullDescription: string;

  addressType: "physical" | "service-area" | "both";
  address: string;
  serviceArea: string;

  coverImage: BusinessMediaInput | null;
  gallery: BusinessGalleryImageInput[];

  services: BusinessServiceInput[];
  openingHours: BusinessOpeningHoursInput[];

  websiteUrl: string;
  socialLinks: BusinessSocialLinksInput;

  promotion: BusinessPromotionInput | null;

  publicationConsent: boolean;
  termsAccepted: boolean;
  trialConsent: boolean;
};
