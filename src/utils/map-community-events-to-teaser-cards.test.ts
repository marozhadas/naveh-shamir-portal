import { describe, expect, it } from "vitest";
import { mapCommunityEventToTeaserCard, pickHomepageTeaserEvents } from "./map-community-events-to-teaser-cards";
import type { CommunityEventRow } from "@/types/community-event";

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
    end_time: "20:00:00",
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

const NOW = new Date("2026-08-05T09:00:00Z"); // Jerusalem: Wed 2026-08-05

describe("pickHomepageTeaserEvents", () => {
  it("excludes past events", () => {
    const events = [makeEvent({ id: "past", event_date: "2026-08-04" }), makeEvent({ id: "future", event_date: "2026-08-10" })];
    expect(pickHomepageTeaserEvents(events, NOW).map((e) => e.id)).toEqual(["future"]);
  });

  it("excludes draft and canceled events (only published)", () => {
    const events = [
      makeEvent({ id: "draft", status: "draft", event_date: "2026-08-10" }),
      makeEvent({ id: "canceled", status: "canceled", event_date: "2026-08-10" }),
      makeEvent({ id: "published", status: "published", event_date: "2026-08-10" }),
    ];
    expect(pickHomepageTeaserEvents(events, NOW).map((e) => e.id)).toEqual(["published"]);
  });

  it("features featured events first, regardless of date order", () => {
    const events = [
      makeEvent({ id: "sooner", event_date: "2026-08-06", featured: false }),
      makeEvent({ id: "featured-later", event_date: "2026-08-20", featured: true }),
    ];
    expect(pickHomepageTeaserEvents(events, NOW).map((e) => e.id)).toEqual(["featured-later", "sooner"]);
  });

  it("orders same-featured-tier events by soonest date then start time", () => {
    const events = [
      makeEvent({ id: "later", event_date: "2026-08-12" }),
      makeEvent({ id: "sooner-evening", event_date: "2026-08-10", start_time: "19:00:00" }),
      makeEvent({ id: "sooner-morning", event_date: "2026-08-10", start_time: "09:00:00" }),
    ];
    expect(pickHomepageTeaserEvents(events, NOW).map((e) => e.id)).toEqual(["sooner-morning", "sooner-evening", "later"]);
  });

  it("caps the result at 4 events", () => {
    const events = Array.from({ length: 10 }, (_, i) => makeEvent({ id: `e${i}`, event_date: "2026-08-10" }));
    expect(pickHomepageTeaserEvents(events, NOW)).toHaveLength(4);
  });

  it("returns an empty array when there are no upcoming published events — never fabricates one", () => {
    expect(pickHomepageTeaserEvents([], NOW)).toEqual([]);
  });
});

describe("mapCommunityEventToTeaserCard", () => {
  it("maps the core fields", () => {
    const card = mapCommunityEventToTeaserCard(makeEvent({ title: "מפגש", short_description: "תיאור", location_name: "מקום" }));
    expect(card.title).toBe("מפגש");
    expect(card.description).toBe("תיאור");
    expect(card.location).toBe("מקום");
    expect(card.startDate).toBe("2026-08-10T18:00");
    expect(card.endDate).toBe("2026-08-10T20:00");
    expect(card.visible).toBe(true);
  });

  it("omits endDate when the event has no end time", () => {
    const card = mapCommunityEventToTeaserCard(makeEvent({ end_time: null }));
    expect(card.endDate).toBe("");
  });

  it("falls back to a placeholder (empty src) when there is no image", () => {
    const card = mapCommunityEventToTeaserCard(makeEvent({ image_url: null }));
    expect(card.image.src).toBe("");
  });

  it("shows a free-event label for free events", () => {
    const card = mapCommunityEventToTeaserCard(makeEvent({ is_free: true }));
    expect(card.priceLabel).toBe("חינם");
  });

  it("shows the real price text for paid events", () => {
    const card = mapCommunityEventToTeaserCard(makeEvent({ is_free: false, price_text: "20 ₪" }));
    expect(card.priceLabel).toBe("20 ₪");
  });

  it("truncates an overly long title rather than letting it break the card layout", () => {
    const card = mapCommunityEventToTeaserCard(makeEvent({ title: "א".repeat(200) }));
    expect(card.title.length).toBeLessThanOrEqual(80);
  });
});
