import { BUSINESS_CATEGORIES } from "@/data/business-categories";
import { DEFAULT_BUSINESS_SORT, isBusinessSort } from "@/types/business-filters";
import type { BusinessFilters } from "@/types/business-filters";

const KNOWN_CATEGORY_IDS = new Set(BUSINESS_CATEGORIES.map((category) => category.id));

/**
 * Reads `q` / `category` / `sort` from any URLSearchParams-shaped object (works for both the
 * real `URLSearchParams` and Next's `ReadonlyURLSearchParams`). Unknown category ids and
 * unrecognized sort values are silently dropped rather than crashing — an old/malformed shared
 * link degrades to "no filter" instead of breaking the page.
 */
export function parseBusinessSearchParams(searchParams: URLSearchParams): BusinessFilters {
  const query = searchParams.get("q") ?? "";

  const categoryParam = searchParams.get("category") ?? "";
  const categoryIds = Array.from(
    new Set(
      categoryParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && KNOWN_CATEGORY_IDS.has(id)),
    ),
  );

  const sortParam = searchParams.get("sort") ?? "";
  const sort = isBusinessSort(sortParam) ? sortParam : DEFAULT_BUSINESS_SORT;

  return { query, categoryIds, sort };
}

/** Omits default/empty values so the URL stays clean (no `?sort=featured&q=&category=`). */
export function serializeBusinessFilters(filters: BusinessFilters): URLSearchParams {
  const params = new URLSearchParams();
  const trimmedQuery = filters.query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (filters.categoryIds.length > 0) params.set("category", filters.categoryIds.join(","));
  if (filters.sort !== DEFAULT_BUSINESS_SORT) params.set("sort", filters.sort);
  return params;
}
