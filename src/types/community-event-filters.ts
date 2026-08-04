import type { EventAudience } from "./community-event";
import type { EventDateFilter } from "@/utils/jerusalem-date";

export const EVENT_DATE_FILTER_OPTIONS: EventDateFilter[] = ["all-upcoming", "today", "tomorrow", "this-week", "this-weekend", "this-month", "custom", "past"];

export const EVENT_DATE_FILTER_LABEL: Record<EventDateFilter, string> = {
  "all-upcoming": "כל האירועים העתידיים",
  today: "היום",
  tomorrow: "מחר",
  "this-week": "השבוע",
  "this-weekend": "סוף השבוע",
  "this-month": "החודש",
  custom: "בחירת תאריך",
  past: "אירועים שהתקיימו",
};

export type EventPriceFilter = "" | "free" | "paid";

export type CommunityEventFilters = {
  query: string;
  audience: EventAudience[];
  dateFilter: EventDateFilter;
  customDate: string;
  price: EventPriceFilter;
};

export const DEFAULT_EVENT_FILTERS: CommunityEventFilters = {
  query: "",
  audience: [],
  dateFilter: "all-upcoming",
  customDate: "",
  price: "",
};

function isEventDateFilter(value: string): value is EventDateFilter {
  return (EVENT_DATE_FILTER_OPTIONS as string[]).includes(value);
}

export function parseCommunityEventSearchParams(searchParams: URLSearchParams): CommunityEventFilters {
  const query = searchParams.get("q") ?? "";

  const audienceParam = searchParams.get("audience") ?? "";
  const knownAudiences = new Set<EventAudience>(["children", "women", "men", "family"]);
  const audience = Array.from(
    new Set(
      audienceParam
        .split(",")
        .map((v) => v.trim())
        .filter((v): v is EventAudience => knownAudiences.has(v as EventAudience)),
    ),
  );

  const dateFilterParam = searchParams.get("date") ?? "";
  const dateFilter = isEventDateFilter(dateFilterParam) ? dateFilterParam : DEFAULT_EVENT_FILTERS.dateFilter;

  const customDate = searchParams.get("on") ?? "";

  const priceParam = searchParams.get("price") ?? "";
  const price = priceParam === "free" || priceParam === "paid" ? priceParam : "";

  return { query, audience, dateFilter, customDate, price };
}

export function serializeCommunityEventFilters(filters: CommunityEventFilters): URLSearchParams {
  const params = new URLSearchParams();
  const trimmedQuery = filters.query.trim();
  if (trimmedQuery) params.set("q", trimmedQuery);
  if (filters.audience.length > 0) params.set("audience", filters.audience.join(","));
  if (filters.dateFilter !== DEFAULT_EVENT_FILTERS.dateFilter) params.set("date", filters.dateFilter);
  if (filters.dateFilter === "custom" && filters.customDate) params.set("on", filters.customDate);
  if (filters.price) params.set("price", filters.price);
  return params;
}
