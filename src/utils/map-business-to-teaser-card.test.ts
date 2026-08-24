import { describe, expect, it } from "vitest";
import { mapBusinessToTeaserCard } from "./map-business-to-teaser-card";
import type { BusinessRegistrationRow } from "@/types/business-registration";

function makeRow(overrides: Partial<BusinessRegistrationRow> = {}): BusinessRegistrationRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "studio-noa",
    business_name: "סטודיו נועה",
    category_id: "beauty",
    description: "טיפולי פנים",
    short_description: "תיאור קצר",
    contact_name: "נועה",
    phone: "+972500000101",
    whatsapp_phone: "+972500000101",
    email: "noa@example.com",
    website_url: "https://example.com",
    address: "רחוב הדקל 4",
    service_area: "נווה שמיר",
    status: "approved",
    featured: true,
    verified: false,
    created_at: "2026-06-01T00:00:00.000Z",
    reviewed_at: "2026-06-02T00:00:00.000Z",
    rejection_reason: null,
    owner_id: null,
    plan_tier: "free",
    active_plan_id: "basic",
    category_ids: null,
    business_type: null,
    public_phone: null,
    public_whatsapp: null,
    public_email: null,
    address_type: null,
    cover_image: null,
    gallery: null,
    services: null,
    testimonials: null,
    opening_hours: null,
    social_links: null,
    promotion: null,
    trial_status: "not-started",
    publication_consent: false,
    terms_accepted: false,
    trial_consent: false,
    dashboard_access_consent: false,
    ...overrides,
  };
}

describe("mapBusinessToTeaserCard", () => {
  it("maps core fields directly", () => {
    const card = mapBusinessToTeaserCard(makeRow(), true);
    expect(card.name).toBe("סטודיו נועה");
    expect(card.slug).toBe("studio-noa");
    expect(card.phone).toBe("tel:+972500000101");
  });

  it("sets cardUrl only when canOpenProfile is true", () => {
    expect(mapBusinessToTeaserCard(makeRow(), true).cardUrl).toBe("/businesses/studio-noa");
    expect(mapBusinessToTeaserCard(makeRow(), false).cardUrl).toBe("");
  });

  // "אין להציג כפתור WhatsApp כלל" for basic (same rule as the archive's own BusinessCard.tsx,
  // a deliberate Plus-upgrade incentive, not an oversight) — canOpenProfile is the same signal
  // used there (only ever true for Plus/Premium), so a basic-tier featured business gets a phone
  // number on its homepage card but never a WhatsApp button, even when it has a number on file.
  it("omits whatsappUrl for a basic-tier business even when it has a whatsapp number", () => {
    const card = mapBusinessToTeaserCard(makeRow({ whatsapp_phone: "+972500000101" }), false);
    expect(card.whatsappUrl).toBe("");
    expect(card.phone).toBe("tel:+972500000101");
  });

  it("includes whatsappUrl for a plus/premium business (canOpenProfile true)", () => {
    const card = mapBusinessToTeaserCard(makeRow({ whatsapp_phone: "+972500000101" }), true);
    expect(card.whatsappUrl).toContain("https://wa.me/972500000101");
  });

  it("prefers public_whatsapp over whatsapp_phone when both are set", () => {
    const card = mapBusinessToTeaserCard(makeRow({ public_whatsapp: "+972501111111", whatsapp_phone: "+972500000101" }), true);
    expect(card.whatsappUrl).toContain("https://wa.me/972501111111");
  });
});
