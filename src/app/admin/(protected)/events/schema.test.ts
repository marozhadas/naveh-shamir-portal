import { describe, expect, it } from "vitest";
import { EMPTY_EVENT_FORM_VALUES, eventFormSchema } from "./schema";
import type { EventFormValues } from "./schema";

function makeValues(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return {
    ...EMPTY_EVENT_FORM_VALUES,
    title: "מפגש קהילתי",
    slug: "meetup",
    shortDescription: "תיאור קצר",
    fullDescription: "תיאור מלא",
    audience: ["family"],
    eventDate: "2026-08-10",
    startTime: "18:00",
    locationName: "מתנ״ס",
    ...overrides,
  };
}

function issuesFor(values: EventFormValues, path: string): string[] {
  const result = eventFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path.join(".") === path).map((i) => i.message);
}

describe("eventFormSchema", () => {
  it("accepts a fully valid free event", () => {
    expect(eventFormSchema.safeParse(makeValues()).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(issuesFor(makeValues({ title: "" }), "title").length).toBeGreaterThan(0);
  });

  it("rejects an empty short description", () => {
    expect(issuesFor(makeValues({ shortDescription: "" }), "shortDescription").length).toBeGreaterThan(0);
  });

  it("rejects an empty full description", () => {
    expect(issuesFor(makeValues({ fullDescription: "" }), "fullDescription").length).toBeGreaterThan(0);
  });

  it("requires at least one audience", () => {
    expect(issuesFor(makeValues({ audience: [] }), "audience").length).toBeGreaterThan(0);
  });

  it("accepts multiple simultaneous audiences", () => {
    expect(eventFormSchema.safeParse(makeValues({ audience: ["family", "children"] })).success).toBe(true);
  });

  it("rejects an invalid date", () => {
    expect(issuesFor(makeValues({ eventDate: "not-a-date" }), "eventDate").length).toBeGreaterThan(0);
  });

  it("requires a start time in HH:MM format", () => {
    expect(issuesFor(makeValues({ startTime: "6pm" }), "startTime").length).toBeGreaterThan(0);
  });

  it("accepts a missing end time (optional)", () => {
    expect(eventFormSchema.safeParse(makeValues({ endTime: "" })).success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    expect(issuesFor(makeValues({ startTime: "18:00", endTime: "17:00" }), "endTime").length).toBeGreaterThan(0);
  });

  it("requires a location name", () => {
    expect(issuesFor(makeValues({ locationName: "" }), "locationName").length).toBeGreaterThan(0);
  });

  it("accepts a Hebrew slug (letters, numbers, hyphens)", () => {
    expect(eventFormSchema.safeParse(makeValues({ slug: "מפגש-קהילתי-2026" })).success).toBe(true);
  });

  it("rejects a slug with spaces or symbols", () => {
    expect(issuesFor(makeValues({ slug: "לא תקין!" }), "slug").length).toBeGreaterThan(0);
  });

  it("rejects an unsafe registration link (not https)", () => {
    expect(issuesFor(makeValues({ registrationUrl: "javascript:alert(1)" }), "registrationUrl").length).toBeGreaterThan(0);
  });

  it("accepts a valid https registration link", () => {
    expect(eventFormSchema.safeParse(makeValues({ registrationUrl: "https://forms.example.com/x" })).success).toBe(true);
  });

  it("rejects an invalid phone number", () => {
    expect(issuesFor(makeValues({ contactPhone: "abc" }), "contactPhone").length).toBeGreaterThan(0);
  });

  it("accepts a valid phone number", () => {
    expect(eventFormSchema.safeParse(makeValues({ contactPhone: "052-1234567" })).success).toBe(true);
  });

  it("rejects an invalid WhatsApp number", () => {
    expect(issuesFor(makeValues({ whatsapp: "not a number" }), "whatsapp").length).toBeGreaterThan(0);
  });

  it("requires a price when the event is not free", () => {
    expect(issuesFor(makeValues({ isFree: false, priceText: "" }), "priceText").length).toBeGreaterThan(0);
  });

  it("accepts a paid event with a price given", () => {
    expect(eventFormSchema.safeParse(makeValues({ isFree: false, priceText: "20 ₪" })).success).toBe(true);
  });

  it("does not require a price when the event is free", () => {
    expect(eventFormSchema.safeParse(makeValues({ isFree: true, priceText: "" })).success).toBe(true);
  });
});
