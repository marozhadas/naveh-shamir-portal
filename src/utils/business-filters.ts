import type { Business } from "@/types/business";
import type { BusinessFilters, BusinessSort } from "@/types/business-filters";
import type { BusinessListingAccess } from "@/types/business-listing-access";
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

/** 0 for premium (canOpenProfile), 1 for basic/unknown — lower sorts first. Never ranks a basic listing above a premium one (spec section 14). */
function tierRank(business: Business, accessByBusinessId?: Record<string, BusinessListingAccess>): number {
  return accessByBusinessId?.[business.id]?.canOpenProfile ? 0 : 1;
}

/**
 * Always returns a new array — never mutates or sorts `businesses` in place. `accessByBusinessId`
 * is optional so existing call sites (and tests) that don't care about tier keep working
 * unchanged; when provided, premium listings never rank below basic ones for a given sort.
 */
export function sortBusinesses(businesses: Business[], sort: BusinessSort, accessByBusinessId?: Record<string, BusinessListingAccess>): Business[] {
  const copy = [...businesses];
  switch (sort) {
    case "name-asc":
      return copy.sort((a, b) => tierRank(a, accessByBusinessId) - tierRank(b, accessByBusinessId) || HEBREW_COLLATOR.compare(a.name, b.name));
    case "name-desc":
      return copy.sort((a, b) => tierRank(a, accessByBusinessId) - tierRank(b, accessByBusinessId) || HEBREW_COLLATOR.compare(b.name, a.name));
    case "newest":
      return copy.sort(
        (a, b) => tierRank(a, accessByBusinessId) - tierRank(b, accessByBusinessId) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    case "featured":
    default:
      // Recommended order (spec section 11): premium+featured, then premium, then basic — tier is
      // the primary key here, featured only breaks ties within the same tier.
      return copy.sort((a, b) => {
        const tierDiff = tierRank(a, accessByBusinessId) - tierRank(b, accessByBusinessId);
        if (tierDiff !== 0) return tierDiff;
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
