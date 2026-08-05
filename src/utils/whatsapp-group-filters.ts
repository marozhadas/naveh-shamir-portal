import { WHATSAPP_GROUP_CATEGORY_LABEL } from "@/types/whatsapp-group";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";
import type { WhatsAppGroupFilters } from "@/types/whatsapp-group-filters";

export function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(entry: WhatsAppGroupRow, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = [entry.name, entry.description ?? "", entry.area_or_street ?? "", WHATSAPP_GROUP_CATEGORY_LABEL[entry.category]].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

function matchesCategory(entry: WhatsAppGroupRow, category: WhatsAppGroupFilters["category"]): boolean {
  if (!category) return true;
  return entry.category === category;
}

function matchesAudience(entry: WhatsAppGroupRow, audience: string): boolean {
  if (!audience) return true;
  return entry.audience.includes(audience);
}

/** Pure filter over already-published groups (status is enforced by the repository query/RLS, not here). */
export function filterWhatsAppGroups(entries: WhatsAppGroupRow[], filters: WhatsAppGroupFilters): WhatsAppGroupRow[] {
  const normalizedQuery = normalizeSearchTerm(filters.query);
  return entries.filter((entry) => matchesQuery(entry, normalizedQuery)).filter((entry) => matchesCategory(entry, filters.category)).filter((entry) => matchesAudience(entry, filters.audience));
}

/** Public sort order (spec section 9): featured first, then priority (higher = first), then name alphabetically. */
export function sortWhatsAppGroups(entries: WhatsAppGroupRow[]): WhatsAppGroupRow[] {
  return [...entries].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.name.localeCompare(b.name, "he");
  });
}

/** Distinct audience tags across the given (already-published) groups, sorted alphabetically — used to build the audience filter dropdown from real data, never a hardcoded list. */
export function collectDistinctAudiences(entries: WhatsAppGroupRow[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.audience) {
      const trimmed = tag.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
}
