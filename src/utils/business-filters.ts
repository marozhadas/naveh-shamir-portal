import type { Business } from "@/types/business";
import type { BusinessFilters, BusinessSort } from "@/types/business-filters";
import { getCategoryLabel } from "@/data/business-categories";

/** Trims and lowercases so matching is both whitespace- and case-insensitive. */
export function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * `visible: false` hides a business outright; a `status` other than "published" (draft,
 * pending-review, suspended, archived) also keeps it out of the archive (spec section 46) even
 * if `visible` is still true — a business with no `status` at all (the homepage's legacy
 * records, which never set this field) is treated as visible, since that field predates status.
 */
function isVisible(business: Business): boolean {
  if (business.visible === false) return false;
  return business.status === undefined || business.status === "published";
}

function matchesQuery(business: Business, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const categoryLabels = (business.categoryIds ?? []).map((id) => getCategoryLabel(id) ?? "");
  const haystack = [
    business.name,
    business.description,
    business.shortDescription ?? "",
    business.serviceArea ?? "",
    business.address ?? "",
    ...categoryLabels,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalizedQuery);
}

function matchesCategories(business: Business, categoryIds: string[]): boolean {
  if (categoryIds.length === 0) return true;
  const businessCategoryIds = business.categoryIds ?? [];
  return categoryIds.some((id) => businessCategoryIds.includes(id));
}

/**
 * Pure filter: visible -> query -> categories (OR within categories), in that order. Never
 * sorts — sortBusinesses is a separate step so callers can mix and match independently.
 */
export function filterBusinesses(businesses: Business[], filters: BusinessFilters): Business[] {
  const normalizedQuery = normalizeSearchTerm(filters.query);
  return businesses
    .filter(isVisible)
    .filter((business) => matchesQuery(business, normalizedQuery))
    .filter((business) => matchesCategories(business, filters.categoryIds));
}

const HEBREW_COLLATOR = new Intl.Collator("he");

/** Always returns a new array — never mutates or sorts `businesses` in place. */
export function sortBusinesses(businesses: Business[], sort: BusinessSort): Business[] {
  const copy = [...businesses];
  switch (sort) {
    case "name-asc":
      return copy.sort((a, b) => HEBREW_COLLATOR.compare(a.name, b.name));
    case "name-desc":
      return copy.sort((a, b) => HEBREW_COLLATOR.compare(b.name, a.name));
    case "newest":
      return copy.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    case "featured":
    default:
      return copy.sort((a, b) => {
        if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
        return HEBREW_COLLATOR.compare(a.name, b.name);
      });
  }
}

/**
 * Counts are scoped to the free-text search only (spec choice, section 10): selecting one
 * category shouldn't shrink the numbers next to the others, so a user can see what adding a
 * second category would yield.
 */
export function getCategoryCounts(businesses: Business[], query: string): Record<string, number> {
  const normalizedQuery = normalizeSearchTerm(query);
  const counts: Record<string, number> = {};
  for (const business of businesses) {
    if (!isVisible(business)) continue;
    if (!matchesQuery(business, normalizedQuery)) continue;
    for (const categoryId of business.categoryIds ?? []) {
      counts[categoryId] = (counts[categoryId] ?? 0) + 1;
    }
  }
  return counts;
}
