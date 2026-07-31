import type { Business } from "@/types/business";

const HEBREW_COLLATOR = new Intl.Collator("he");

/**
 * Published businesses only, excluding the current one, sharing at least one category —
 * featured first, then alphabetical (spec section 29). Never mutates `businesses`.
 */
export function getRelatedBusinesses(currentBusiness: Business, businesses: Business[], limit: number): Business[] {
  const currentCategoryIds = new Set(currentBusiness.categoryIds ?? []);

  return businesses
    .filter((business) => business.id !== currentBusiness.id)
    .filter((business) => business.status === "published")
    .filter((business) => (business.categoryIds ?? []).some((id) => currentCategoryIds.has(id)))
    .sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
      return HEBREW_COLLATOR.compare(a.name, b.name);
    })
    .slice(0, limit);
}
