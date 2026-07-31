import { describe, expect, it } from "vitest";
import { headerSettingsSchema } from "./header.schema";
import { featuredBusinessesSettingsSchema } from "./businesses.schema";
import { upcomingEventsSettingsSchema } from "./events.schema";
import { footerSettingsSchema } from "./footer.schema";
import {
  defaultFeaturedBusinessesSettings,
  defaultFooterSettings,
  defaultHeaderSettings,
  defaultUpcomingEventsSettings,
} from "@/editor/config/editor-defaults";

describe("headerSettingsSchema safeguards", () => {
  it("rejects hiding every nav item at once", () => {
    const result = headerSettingsSchema.safeParse({
      ...defaultHeaderSettings,
      content: {
        ...defaultHeaderSettings.content,
        navItems: defaultHeaderSettings.content.navItems.map((item) => ({ ...item, visible: false })),
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a javascript: URL on the CTA button", () => {
    const result = headerSettingsSchema.safeParse({
      ...defaultHeaderSettings,
      content: { ...defaultHeaderSettings.content, ctaHref: "javascript:alert(1)" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty required label", () => {
    const result = headerSettingsSchema.safeParse({
      ...defaultHeaderSettings,
      content: { ...defaultHeaderSettings.content, ctaLabel: "" },
    });
    expect(result.success).toBe(false);
  });
});

describe("featuredBusinessesSettingsSchema safeguards", () => {
  it("rejects hiding every business card at once", () => {
    const result = featuredBusinessesSettingsSchema.safeParse({
      ...defaultFeaturedBusinessesSettings,
      content: {
        ...defaultFeaturedBusinessesSettings.content,
        cards: defaultFeaturedBusinessesSettings.content.cards.map((card) => ({ ...card, visible: false })),
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate ids among cards", () => {
    const [first, second, ...rest] = defaultFeaturedBusinessesSettings.content.cards;
    const result = featuredBusinessesSettingsSchema.safeParse({
      ...defaultFeaturedBusinessesSettings,
      content: {
        ...defaultFeaturedBusinessesSettings.content,
        cards: [first, { ...second, id: first.id }, ...rest],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a cardsOrder that doesn't match the cards list", () => {
    const result = featuredBusinessesSettingsSchema.safeParse({
      ...defaultFeaturedBusinessesSettings,
      content: { ...defaultFeaturedBusinessesSettings.content, cardsOrder: ["nonexistent-id"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative-looking / unsupported mobile column count", () => {
    const result = featuredBusinessesSettingsSchema.safeParse({
      ...defaultFeaturedBusinessesSettings,
      layout: { ...defaultFeaturedBusinessesSettings.layout, columnsMobile: 2 },
    });
    expect(result.success).toBe(false);
  });
});

describe("upcomingEventsSettingsSchema safeguards", () => {
  it("rejects an event whose end date is before its start date", () => {
    const [first, ...rest] = defaultUpcomingEventsSettings.content.events;
    const result = upcomingEventsSettingsSchema.safeParse({
      ...defaultUpcomingEventsSettings,
      content: {
        ...defaultUpcomingEventsSettings.content,
        events: [{ ...first, startDate: "2026-08-20T00:00:00+03:00", endDate: "2026-08-10T00:00:00+03:00" }, ...rest],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects hiding every event at once", () => {
    const result = upcomingEventsSettingsSchema.safeParse({
      ...defaultUpcomingEventsSettings,
      content: {
        ...defaultUpcomingEventsSettings.content,
        events: defaultUpcomingEventsSettings.content.events.map((event) => ({ ...event, visible: false })),
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("footerSettingsSchema safeguards", () => {
  it("rejects showLegalLinks: false", () => {
    const result = footerSettingsSchema.safeParse({
      ...defaultFooterSettings,
      content: { ...defaultFooterSettings.content, showLegalLinks: false },
    });
    expect(result.success).toBe(false);
  });

  it("rejects hiding every footer nav item at once", () => {
    const result = footerSettingsSchema.safeParse({
      ...defaultFooterSettings,
      content: {
        ...defaultFooterSettings.content,
        navItems: defaultFooterSettings.content.navItems.map((item) => ({ ...item, visible: false })),
      },
    });
    expect(result.success).toBe(false);
  });
});
