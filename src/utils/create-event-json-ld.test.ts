import { describe, expect, it } from "vitest";
import { createEventJsonLd } from "./create-event-json-ld";
import type { CommunityEventRow } from "@/types/community-event";

function makeEvent(overrides: Partial<CommunityEventRow> = {}): CommunityEventRow {
  return {
    id: "id",
    title: "מפגש קהילתי",
    slug: "community-meetup",
    short_description: "תיאור קצר",
    full_description: "תיאור מלא",
    audience: ["family"],
    category: null,
    event_date: "2026-08-10",
    start_time: "18:00:00",
    end_time: "20:00:00",
    location_name: "מתנ״ס נווה שמיר",
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

describe("createEventJsonLd", () => {
  it("returns null for a draft event — draft events must never be given structured data", () => {
    expect(createEventJsonLd(makeEvent({ status: "draft" }))).toBeNull();
  });

  it("produces a valid Event schema for a published event", () => {
    const data = createEventJsonLd(makeEvent());
    expect(data).not.toBeNull();
    expect(data!["@type"]).toBe("Event");
    expect(data!.name).toBe("מפגש קהילתי");
    expect(data!.startDate).toBe("2026-08-10T18:00:00");
    expect(data!.endDate).toBe("2026-08-10T20:00:00");
    expect(data!.url).toContain("/events/community-meetup");
    expect(data!.eventStatus).toBe("https://schema.org/EventScheduled");
  });

  it("marks a canceled event with EventCancelled and still includes it (direct-link resolves, not a 404)", () => {
    const data = createEventJsonLd(makeEvent({ status: "canceled" }));
    expect(data).not.toBeNull();
    expect(data!.eventStatus).toBe("https://schema.org/EventCancelled");
  });

  it("omits endDate entirely when there is no end time", () => {
    const data = createEventJsonLd(makeEvent({ end_time: null }));
    expect(data).not.toHaveProperty("endDate");
  });

  it("never fabricates an image when none exists", () => {
    const data = createEventJsonLd(makeEvent({ image_url: null }));
    expect(data).not.toHaveProperty("image");
  });

  it("includes the image when present", () => {
    const data = createEventJsonLd(makeEvent({ image_url: "https://example.com/photo.jpg" }));
    expect(data!.image).toEqual(["https://example.com/photo.jpg"]);
  });

  it("free events never include an offers block", () => {
    const data = createEventJsonLd(makeEvent({ is_free: true }));
    expect(data).not.toHaveProperty("offers");
  });

  it("paid events include an offers block pointing at the registration link when present", () => {
    const data = createEventJsonLd(makeEvent({ is_free: false, price_text: "20 ₪", registration_url: "https://example.com/register" }));
    expect(data!.offers).toMatchObject({ "@type": "Offer", priceCurrency: "ILS", url: "https://example.com/register", description: "20 ₪" });
  });

  it("paid events without a registration link fall back to the event's own page URL", () => {
    const data = createEventJsonLd(makeEvent({ is_free: false, registration_url: null }));
    expect((data!.offers as { url: string }).url).toContain("/events/community-meetup");
  });
});
