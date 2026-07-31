export type BusinessSort = "featured" | "name-asc" | "name-desc" | "newest";

/**
 * The single source of truth for the archive's active filters is the URL (see
 * use-business-search-params.ts) — this type describes that parsed shape, not a separate
 * client-only state store.
 */
export type BusinessFilters = {
  query: string;
  categoryIds: string[];
  sort: BusinessSort;
};

export const DEFAULT_BUSINESS_SORT: BusinessSort = "featured";

export const BUSINESS_SORT_OPTIONS: BusinessSort[] = ["featured", "name-asc", "name-desc", "newest"];

export function isBusinessSort(value: string): value is BusinessSort {
  return (BUSINESS_SORT_OPTIONS as string[]).includes(value);
}
