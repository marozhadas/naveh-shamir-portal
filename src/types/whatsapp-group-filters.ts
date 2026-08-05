import { WHATSAPP_GROUP_CATEGORY_OPTIONS } from "./whatsapp-group";
import type { WhatsAppGroupCategory } from "./whatsapp-group";

export type WhatsAppGroupFilters = {
  query: string;
  category: WhatsAppGroupCategory | "";
  audience: string;
};

export const DEFAULT_WHATSAPP_GROUP_FILTERS: WhatsAppGroupFilters = { query: "", category: "", audience: "" };

function isWhatsAppGroupCategory(value: string): value is WhatsAppGroupCategory {
  return (WHATSAPP_GROUP_CATEGORY_OPTIONS as string[]).includes(value);
}

// Distinct query-param names from the essential-numbers filters (q/category) since both filter
// UIs live on the same page (/essential-numbers) and share the URL.
export function parseWhatsAppGroupSearchParams(searchParams: URLSearchParams): WhatsAppGroupFilters {
  const query = searchParams.get("waq") ?? "";
  const categoryParam = searchParams.get("wacategory") ?? "";
  const category = isWhatsAppGroupCategory(categoryParam) ? categoryParam : "";
  const audience = searchParams.get("waaudience") ?? "";
  return { query, category, audience };
}

export function serializeWhatsAppGroupFilters(filters: WhatsAppGroupFilters, existing?: URLSearchParams): URLSearchParams {
  // Preserve any other page params (e.g. the essential-numbers q/category) already in the URL.
  const params = new URLSearchParams(existing);
  params.delete("waq");
  params.delete("wacategory");
  params.delete("waaudience");
  const trimmedQuery = filters.query.trim();
  if (trimmedQuery) params.set("waq", trimmedQuery);
  if (filters.category) params.set("wacategory", filters.category);
  if (filters.audience) params.set("waaudience", filters.audience);
  return params;
}
