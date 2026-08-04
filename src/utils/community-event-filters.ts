import type { CommunityEventRow } from "@/types/community-event";
import type { CommunityEventFilters } from "@/types/community-event-filters";
import { EVENT_AUDIENCE_LABEL } from "@/types/community-event";
import { resolveEventDateRange } from "./jerusalem-date";

export function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(event: CommunityEventRow, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const audienceLabels = event.audience.map((a) => EVENT_AUDIENCE_LABEL[a]);
  const haystack = [event.title, event.short_description, event.location_name, event.category ?? "", ...audienceLabels].join(" ").toLowerCase();
  return haystack.includes(normalizedQuery);
}

/** An event matches if it has ANY of the selected audiences (OR, not AND) — an event tagged both "family" and "children" should show under either filter. */
function matchesAudience(event: CommunityEventRow, audience: CommunityEventFilters["audience"]): boolean {
  if (audience.length === 0) return true;
  return audience.some((a) => event.audience.includes(a));
}

function matchesPrice(event: CommunityEventRow, price: CommunityEventFilters["price"]): boolean {
  if (!price) return true;
  return price === "free" ? event.is_free : !event.is_free;
}

function matchesDateRange(event: CommunityEventRow, filters: CommunityEventFilters, now: Date): boolean {
  const { start, end } = resolveEventDateRange(filters.dateFilter, now, filters.customDate);
  if (event.event_date < start) return false;
  if (end !== null && event.event_date > end) return false;
  return true;
}

/** Pure filter over already-published events (status is enforced by the repository query, not here). `now` is injectable for tests. */
export function filterCommunityEvents(events: CommunityEventRow[], filters: CommunityEventFilters, now: Date = new Date()): CommunityEventRow[] {
  const normalizedQuery = normalizeSearchTerm(filters.query);
  return events
    .filter((event) => matchesQuery(event, normalizedQuery))
    .filter((event) => matchesAudience(event, filters.audience))
    .filter((event) => matchesPrice(event, filters.price))
    .filter((event) => matchesDateRange(event, filters, now));
}

/** Closest date first; same-day events are ordered by start time, then by display_order/featured. */
export function sortCommunityEventsByDate(events: CommunityEventRow[]): CommunityEventRow[] {
  return [...events].sort((a, b) => {
    if (a.event_date !== b.event_date) return a.event_date < b.event_date ? -1 : 1;
    if (a.start_time !== b.start_time) return a.start_time < b.start_time ? -1 : 1;
    return b.display_order - a.display_order;
  });
}
