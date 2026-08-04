import { describe, expect, it } from "vitest";
import { filterCommunityEvents, normalizeSearchTerm, sortCommunityEventsByDate } from "./community-event-filters";
import type { CommunityEventRow } from "@/types/community-event";
import type { CommunityEventFilters } from "@/types/community-event-filters";
import { DEFAULT_EVENT_FILTERS } from "@/types/community-event-filters";

function makeEvent(overrides: Partial<CommunityEventRow> = {}): CommunityEventRow {
  return {
    id: "id",
    title: "אירוע",
    slug: "event",
    short_description: "תיאור קצר",
    full_description: "תיאור מלא",
    audience: ["family"],
    category: null,
    event_date: "2026-08-10",
    start_time: "18:00:00",
    end_time: null,
    location_name: "מתנ״ס",
    address: null,
    image_url: null,
    image_alt: null,
    is_free: true,
    price_text: null,
    registration_url: null,
    contact_phone: null,
    whatsapp: null,
    status: "published",
    featured: false,
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: "2026-01-01T00:00:00Z",
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

// All date-range assertions below are anchored to this fixed instant so the "today" boundary
// never depends on when the test suite actually runs.
const NOW = new Date("2026-08-05T09:00:00Z"); // Jerusalem: Wed 2026-08-05

describe("normalizeSearchTerm", () => {
  it("trims and lowercases", () => {
    expect(normalizeSearchTerm("  Yoga  ")).toBe("yoga");
  });
});

describe("filterCommunityEvents — audience", () => {
  const events = [
    makeEvent({ id: "children", audience: ["children"] }),
    makeEvent({ id: "women", audience: ["women"] }),
    makeEvent({ id: "family-and-children", audience: ["family", "children"] }),
  ];

  it("no audience filter selected returns everything", () => {
    const result = filterCommunityEvents(events, DEFAULT_EVENT_FILTERS, NOW);
    expect(result.map((e) => e.id).sort()).toEqual(["children", "family-and-children", "women"]);
  });

  it("matches a single selected audience", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, audience: ["women"] }, NOW);
    expect(result.map((e) => e.id)).toEqual(["women"]);
  });

  it("uses OR semantics across multiple selected audiences", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, audience: ["women", "children"] }, NOW);
    expect(result.map((e) => e.id).sort()).toEqual(["children", "family-and-children", "women"]);
  });

  it("an event tagged with multiple audiences matches under any one of them", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, audience: ["family"] }, NOW);
    expect(result.map((e) => e.id)).toEqual(["family-and-children"]);
  });
});

describe("filterCommunityEvents — date range", () => {
  const events = [
    makeEvent({ id: "yesterday", event_date: "2026-08-04" }),
    makeEvent({ id: "today", event_date: "2026-08-05" }),
    makeEvent({ id: "tomorrow", event_date: "2026-08-06" }),
    makeEvent({ id: "next-week", event_date: "2026-08-14" }),
  ];

  it("all-upcoming (default) excludes past events but includes today onward", () => {
    const result = filterCommunityEvents(events, DEFAULT_EVENT_FILTERS, NOW);
    expect(result.map((e) => e.id)).toEqual(["today", "tomorrow", "next-week"]);
  });

  it("today: only events dated today in Jerusalem", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, dateFilter: "today" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["today"]);
  });

  it("tomorrow: only events dated tomorrow", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, dateFilter: "tomorrow" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["tomorrow"]);
  });

  it("this-week: today through Saturday, excludes next week", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, dateFilter: "this-week" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["today", "tomorrow"]);
  });

  it("custom: an explicit date only", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, dateFilter: "custom", customDate: "2026-08-14" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["next-week"]);
  });

  it("past: only events strictly before today (opt-in toggle, not the default)", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, dateFilter: "past" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["yesterday"]);
  });
});

describe("filterCommunityEvents — price", () => {
  const events = [makeEvent({ id: "free", is_free: true }), makeEvent({ id: "paid", is_free: false })];

  it("free: only free events", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, price: "free" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["free"]);
  });

  it("paid: only paid events", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, price: "paid" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["paid"]);
  });

  it("no price filter returns both", () => {
    const result = filterCommunityEvents(events, DEFAULT_EVENT_FILTERS, NOW);
    expect(result.map((e) => e.id).sort()).toEqual(["free", "paid"]);
  });
});

describe("filterCommunityEvents — query", () => {
  const events = [
    makeEvent({ id: "1", title: "מפגש הורים וילדים", short_description: "יצירה משותפת" }),
    makeEvent({ id: "2", title: "ערב יוגה", short_description: "שיעור פתוח לכולם", location_name: "אולם הספורט" }),
  ];

  it("matches by title", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, query: "יוגה" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("matches by short description", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, query: "יצירה" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["1"]);
  });

  it("matches by location", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, query: "הספורט" }, NOW);
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("trims and ignores case", () => {
    const result = filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, query: "  יוגה  " }, NOW);
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("combines query with audience and date filters", () => {
    const combined: CommunityEventFilters = { ...DEFAULT_EVENT_FILTERS, query: "יוגה", dateFilter: "all-upcoming" };
    const result = filterCommunityEvents(events, combined, NOW);
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("does not mutate the input array", () => {
    const before = [...events];
    filterCommunityEvents(events, { ...DEFAULT_EVENT_FILTERS, query: "יוגה" }, NOW);
    expect(events).toEqual(before);
  });
});

describe("sortCommunityEventsByDate", () => {
  it("sorts by date ascending, closest first", () => {
    const events = [makeEvent({ id: "later", event_date: "2026-09-01" }), makeEvent({ id: "sooner", event_date: "2026-08-06" })];
    const result = sortCommunityEventsByDate(events);
    expect(result.map((e) => e.id)).toEqual(["sooner", "later"]);
  });

  it("same-day events are ordered by start time", () => {
    const events = [
      makeEvent({ id: "evening", event_date: "2026-08-10", start_time: "19:00:00" }),
      makeEvent({ id: "morning", event_date: "2026-08-10", start_time: "09:00:00" }),
    ];
    const result = sortCommunityEventsByDate(events);
    expect(result.map((e) => e.id)).toEqual(["morning", "evening"]);
  });

  it("same date and time falls back to higher display_order first", () => {
    const events = [
      makeEvent({ id: "low", event_date: "2026-08-10", start_time: "09:00:00", display_order: 0 }),
      makeEvent({ id: "high", event_date: "2026-08-10", start_time: "09:00:00", display_order: 5 }),
    ];
    const result = sortCommunityEventsByDate(events);
    expect(result.map((e) => e.id)).toEqual(["high", "low"]);
  });

  it("does not mutate the input array", () => {
    const events = [makeEvent({ id: "a", event_date: "2026-09-01" }), makeEvent({ id: "b", event_date: "2026-08-06" })];
    const before = [...events];
    sortCommunityEventsByDate(events);
    expect(events).toEqual(before);
  });
});
