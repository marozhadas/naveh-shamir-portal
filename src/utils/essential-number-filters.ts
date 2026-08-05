import { ESSENTIAL_NUMBER_CATEGORY_LABEL } from "@/types/essential-number";
import type { EssentialNumberRow } from "@/types/essential-number";
import type { EssentialNumberFilters } from "@/types/essential-number-filters";

export function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(entry: EssentialNumberRow, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = [entry.name, entry.description ?? "", ESSENTIAL_NUMBER_CATEGORY_LABEL[entry.category]].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

function matchesCategory(entry: EssentialNumberRow, category: EssentialNumberFilters["category"]): boolean {
  if (!category) return true;
  return entry.category === category;
}

/** Pure filter over already-published numbers (status is enforced by the repository query/RLS, not here). */
export function filterEssentialNumbers(entries: EssentialNumberRow[], filters: EssentialNumberFilters): EssentialNumberRow[] {
  const normalizedQuery = normalizeSearchTerm(filters.query);
  return entries.filter((entry) => matchesQuery(entry, normalizedQuery)).filter((entry) => matchesCategory(entry, filters.category));
}

/** Public sort order (spec section 15): featured first, then priority (higher = first), then name alphabetically. */
export function sortEssentialNumbers(entries: EssentialNumberRow[]): EssentialNumberRow[] {
  return [...entries].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.name.localeCompare(b.name, "he");
  });
}
