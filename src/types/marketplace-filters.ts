export type MarketplaceSort = "newest" | "price-asc" | "price-desc";

export type MarketplacePriceRange = "" | "free" | "0-50" | "50-100" | "100-250" | "250-500" | "500-plus";

export const PRICE_RANGE_OPTIONS: MarketplacePriceRange[] = ["", "free", "0-50", "50-100", "100-250", "250-500", "500-plus"];

export const PRICE_RANGE_LABEL: Record<MarketplacePriceRange, string> = {
  "": "כל המחירים",
  free: "חינם",
  "0-50": "עד 50 ₪",
  "50-100": "50–100 ₪",
  "100-250": "100–250 ₪",
  "250-500": "250–500 ₪",
  "500-plus": "מעל 500 ₪",
};

/** The single source of truth for the archive's active filters is the URL (see use-marketplace-search-params.ts). */
export type MarketplaceFilters = {
  query: string;
  /** "" means "all" — not a real filterable value. */
  listingType: "" | "giveaway" | "sale";
  categoryId: string;
  priceRange: MarketplacePriceRange;
  sort: MarketplaceSort;
};

export const DEFAULT_MARKETPLACE_SORT: MarketplaceSort = "newest";

export const MARKETPLACE_SORT_OPTIONS: MarketplaceSort[] = ["newest", "price-asc", "price-desc"];

export const MARKETPLACE_SORT_LABEL: Record<MarketplaceSort, string> = {
  newest: "החדש ביותר",
  "price-asc": "המחיר הנמוך ביותר",
  "price-desc": "המחיר הגבוה ביותר",
};

export function isMarketplaceSort(value: string): value is MarketplaceSort {
  return (MARKETPLACE_SORT_OPTIONS as string[]).includes(value);
}

export function isPriceRange(value: string): value is MarketplacePriceRange {
  return (PRICE_RANGE_OPTIONS as string[]).includes(value);
}
