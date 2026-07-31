import { SITE_CONFIG } from "@/data/config";
import type { Business } from "@/types/business";
import { getBusinessContact, getBusinessHeroImage } from "@/utils/business-profile";

/** A plain object, not a class — this is just the shape we serialize into a <script type="application/ld+json">. */
export type LocalBusinessStructuredData = {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  name: string;
  description?: string;
  url: string;
  image?: string;
  telephone?: string;
  address?: { "@type": "PostalAddress"; streetAddress?: string; addressLocality?: string };
  openingHoursSpecification?: Array<{
    "@type": "OpeningHoursSpecification";
    dayOfWeek: string;
    opens: string;
    closes: string;
  }>;
  sameAs?: string[];
};

const SCHEMA_DAY_OF_WEEK: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

/**
 * Only includes fields that actually exist on `business` (spec section 44) — never fabricates a
 * rating, price range, or opening hours the business hasn't set.
 */
export function createLocalBusinessStructuredData(business: Business): LocalBusinessStructuredData {
  const contact = getBusinessContact(business);
  const heroImage = getBusinessHeroImage(business);
  const location = business.location;

  const data: LocalBusinessStructuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${SITE_CONFIG.siteUrl}/businesses/${business.slug}`,
  };

  const description = business.fullDescription || business.shortDescription || business.description;
  if (description) data.description = description;
  if (heroImage.src) data.image = `${SITE_CONFIG.siteUrl}${heroImage.src}`;

  const telephone = contact.phone?.replace(/^tel:/, "");
  if (telephone) data.telephone = telephone;

  if (location?.address || location?.city) {
    data.address = {
      "@type": "PostalAddress",
      ...(location.address ? { streetAddress: location.address } : {}),
      ...(location.city ? { addressLocality: location.city } : {}),
    };
  }

  if (business.openingHours && business.openingHours.length > 0) {
    const spec = business.openingHours
      .filter((entry) => !entry.closed)
      .flatMap((entry) =>
        entry.intervals.map((interval) => ({
          "@type": "OpeningHoursSpecification" as const,
          dayOfWeek: SCHEMA_DAY_OF_WEEK[entry.day],
          opens: interval.opensAt,
          closes: interval.closesAt,
        })),
      );
    if (spec.length > 0) data.openingHoursSpecification = spec;
  }

  const sameAs = Object.values(business.socialLinks ?? {}).filter((url): url is string => Boolean(url));
  if (sameAs.length > 0) data.sameAs = sameAs;

  return data;
}
