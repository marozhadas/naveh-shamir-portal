import type { MarketplaceListingRow } from "@/types/marketplace";
import type { MarketplaceFilters, MarketplacePriceRange, MarketplaceSort } from "@/types/marketplace-filters";
import { getMarketplaceCategoryLabel } from "@/data/marketplace-categories";

export function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(listing: MarketplaceListingRow, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const categoryLabel = getMarketplaceCategoryLabel(listing.category_id) ?? "";
  const haystack = [listing.title, listing.description, categoryLabel].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

function matchesListingType(listing: MarketplaceListingRow, listingType: MarketplaceFilters["listingType"]): boolean {
  if (!listingType) return true;
  return listing.listing_type === listingType;
}

function matchesCategory(listing: MarketplaceListingRow, categoryId: string): boolean {
  if (!categoryId) return true;
  return listing.category_id === categoryId;
}

function matchesPriceRange(listing: MarketplaceListingRow, priceRange: MarketplacePriceRange): boolean {
  if (!priceRange) return true;
  if (priceRange === "free") return listing.is_free;
  if (listing.is_free || listing.price === null) return false;
  const price = listing.price;
  switch (priceRange) {
    case "0-50":
      return price <= 50;
    case "50-100":
      return price > 50 && price <= 100;
    case "100-250":
      return price > 100 && price <= 250;
    case "250-500":
      return price > 250 && price <= 500;
    case "500-plus":
      return price > 500;
    default:
      return true;
  }
}

/** Pure filter over already-active listings (status is enforced by RLS/repository, not here). */
export function filterMarketplaceListings(listings: MarketplaceListingRow[], filters: MarketplaceFilters): MarketplaceListingRow[] {
  const normalizedQuery = normalizeSearchTerm(filters.query);
  return listings
    .filter((listing) => matchesQuery(listing, normalizedQuery))
    .filter((listing) => matchesListingType(listing, filters.listingType))
    .filter((listing) => matchesCategory(listing, filters.categoryId))
    .filter((listing) => matchesPriceRange(listing, filters.priceRange));
}

function effectivePrice(listing: MarketplaceListingRow): number {
  if (listing.is_free || listing.price === null) return 0;
  return listing.price;
}

export function sortMarketplaceListings(listings: MarketplaceListingRow[], sort: MarketplaceSort): MarketplaceListingRow[] {
  const copy = [...listings];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-desc":
      return copy.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "newest":
    default:
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/** Counts scoped to query + listing-type only (spec choice, mirrors getCategoryCounts): picking a category shouldn't shrink the numbers next to the others. */
export function getMarketplaceCategoryCounts(listings: MarketplaceListingRow[], filters: Pick<MarketplaceFilters, "query" | "listingType">): Record<string, number> {
  const normalizedQuery = normalizeSearchTerm(filters.query);
  const counts: Record<string, number> = {};
  for (const listing of listings) {
    if (!matchesQuery(listing, normalizedQuery)) continue;
    if (!matchesListingType(listing, filters.listingType)) continue;
    counts[listing.category_id] = (counts[listing.category_id] ?? 0) + 1;
  }
  return counts;
}
