import { MARKETPLACE_CATEGORIES } from "@/data/marketplace-categories";
import { DEFAULT_MARKETPLACE_SORT, isMarketplaceSort, isPriceRange } from "@/types/marketplace-filters";
import type { MarketplaceFilters } from "@/types/marketplace-filters";

const KNOWN_CATEGORY_IDS = new Set(MARKETPLACE_CATEGORIES.map((category) => category.id));

/** Unknown/malformed values are silently dropped rather than crashing — an old shared link degrades to "no filter", not a broken page. */
export function parseMarketplaceSearchParams(searchParams: URLSearchParams): MarketplaceFilters {
  const query = searchParams.get("q") ?? "";

  const listingTypeParam = searchParams.get("type") ?? "";
  const listingType = listingTypeParam === "giveaway" || listingTypeParam === "sale" ? listingTypeParam : "";

  const categoryParam = searchParams.get("category") ?? "";
  const categoryId = KNOWN_CATEGORY_IDS.has(categoryParam) ? categoryParam : "";

  const priceRangeParam = searchParams.get("price") ?? "";
  const priceRange = isPriceRange(priceRangeParam) ? priceRangeParam : "";

  const sortParam = searchParams.get("sort") ?? "";
  const sort = isMarketplaceSort(sortParam) ? sortParam : DEFAULT_MARKETPLACE_SORT;

  return { query, listingType, categoryId, priceRange, sort };
}

/** Omits default/empty values so the URL stays clean. */
export function serializeMarketplaceFilters(filters: MarketplaceFilters): URLSearchParams {
  const params = new URLSearchParams();
  const trimmedQuery = filters.query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (filters.listingType) params.set("type", filters.listingType);
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.priceRange) params.set("price", filters.priceRange);
  if (filters.sort !== DEFAULT_MARKETPLACE_SORT) params.set("sort", filters.sort);
  return params;
}
