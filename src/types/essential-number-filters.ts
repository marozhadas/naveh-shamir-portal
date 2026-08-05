import { ESSENTIAL_NUMBER_CATEGORY_OPTIONS } from "./essential-number";
import type { EssentialNumberCategory } from "./essential-number";

export type EssentialNumberFilters = {
  query: string;
  category: EssentialNumberCategory | "";
};

export const DEFAULT_ESSENTIAL_NUMBER_FILTERS: EssentialNumberFilters = { query: "", category: "" };

function isEssentialNumberCategory(value: string): value is EssentialNumberCategory {
  return (ESSENTIAL_NUMBER_CATEGORY_OPTIONS as string[]).includes(value);
}

export function parseEssentialNumberSearchParams(searchParams: URLSearchParams): EssentialNumberFilters {
  const query = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category") ?? "";
  const category = isEssentialNumberCategory(categoryParam) ? categoryParam : "";
  return { query, category };
}

export function serializeEssentialNumberFilters(filters: EssentialNumberFilters): URLSearchParams {
  const params = new URLSearchParams();
  const trimmedQuery = filters.query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (filters.category) params.set("category", filters.category);
  return params;
}
