import type { BusinessPublicationStatus } from "./business-status";

export type BusinessCategory = "אוכל" | "חוגים" | 'גמ"ח' | "שירותים";

export type BusinessGalleryImage = {
  id: string;
  src: string;
  alt: string;
  order: number;
};

export type BusinessService = {
  id: string;
  name: string;
  description?: string;
  priceLabel?: string;
  visible: boolean;
  order: number;
};

export type Weekday = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export type BusinessOpeningHours = {
  day: Weekday;
  closed: boolean;
  intervals: { opensAt: string; closesAt: string }[];
};

export type BusinessPromotion = {
  title: string;
  description?: string;
  validUntil?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  visible: boolean;
};

export type BusinessSocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
};

/** Richer contact/location shapes used only by the full profile page (/businesses/[slug]) — see the note on `Business` below for why these coexist with the flat archive fields instead of replacing them. */
export type BusinessContact = {
  phone?: string;
  whatsappUrl?: string;
  email?: string;
  websiteUrl?: string;
};

export type BusinessLocation = {
  address?: string;
  neighborhood: string;
  city?: string;
  serviceArea?: string;
  latitude?: number;
  longitude?: number;
};

/**
 * Fields from `categoryIds` through `createdAt` were added for the business archive
 * (/businesses) in an earlier phase; fields from `ownerId` on were added for the full profile
 * page (/businesses/[slug]) and the subscription/trial model in this phase. Both sets are
 * additive and optional on purpose: src/data/businesses.ts (the homepage's editor-curated
 * cards) and src/data/businesses-directory.ts (the archive) only ever set the flat fields
 * (`phone`, `whatsappUrl`, `websiteUrl`, `address`, `serviceArea`, `imageUrl`/`imageAlt`) and
 * keep working completely unchanged. The new nested `contact`/`location`/`image` are read only
 * by the profile-page components, with the flat fields as their fallback — see
 * src/utils/business-profile.ts. Duplicating a value in both places for a business that has a
 * full profile is expected and kept in sync by hand in the (still-static) demo data.
 */
export type Business = {
  id: string;
  slug: string;
  name: string;
  category: BusinessCategory;
  description: string;
  imageUrl: string;
  imageAlt: string;
  phone?: string;
  whatsappUrl?: string;
  categoryIds?: string[];
  shortDescription?: string;
  websiteUrl?: string;
  address?: string;
  serviceArea?: string;
  featured?: boolean;
  verified?: boolean;
  visible?: boolean;
  createdAt?: string;

  ownerId?: string;
  status?: BusinessPublicationStatus;
  fullDescription?: string;
  image?: { src: string; alt: string };
  gallery?: BusinessGalleryImage[];
  contact?: BusinessContact;
  location?: BusinessLocation;
  openingHours?: BusinessOpeningHours[];
  services?: BusinessService[];
  socialLinks?: BusinessSocialLinks;
  highlights?: string[];
  promotion?: BusinessPromotion;
  updatedAt?: string;
  publishedAt?: string;
};
