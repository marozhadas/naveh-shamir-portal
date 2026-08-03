import { describe, expect, it } from "vitest";
import { mapRegistrationToBusiness } from "./map-registration-to-business";
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
    featured: false,
    verified: false,
    created_at: "2026-06-01T00:00:00.000Z",
    reviewed_at: "2026-06-02T00:00:00.000Z",
    rejection_reason: null,
    owner_id: null,
    plan_tier: "free",
    category_ids: null,
    business_type: null,
    public_phone: null,
    public_whatsapp: null,
    public_email: null,
    address_type: null,
    cover_image: null,
    gallery: null,
    services: null,
    opening_hours: null,
    social_links: null,
    promotion: null,
    trial_status: "not-started",
    publication_consent: false,
    terms_accepted: false,
    trial_consent: false,
    ...overrides,
  };
}

describe("mapRegistrationToBusiness", () => {
  it("maps core fields directly", () => {
    const business = mapRegistrationToBusiness(makeRow());
    expect(business.name).toBe("סטודיו נועה");
    expect(business.slug).toBe("studio-noa");
    expect(business.description).toBe("טיפולי פנים");
    expect(business.categoryIds).toEqual(["beauty"]);
    expect(business.status).toBe("published");
    expect(business.visible).toBe(true);
  });

  it("builds a wa.me link from the whatsapp phone number", () => {
    const business = mapRegistrationToBusiness(makeRow({ whatsapp_phone: "+972-50-000-0101" }));
    expect(business.whatsappUrl).toBe("https://wa.me/972500000101");
  });

  it("leaves whatsappUrl undefined when there's no whatsapp phone", () => {
    const business = mapRegistrationToBusiness(makeRow({ whatsapp_phone: null }));
    expect(business.whatsappUrl).toBeUndefined();
  });

  it("falls back to a sensible legacy category for an unmapped archive category", () => {
    const business = mapRegistrationToBusiness(makeRow({ category_id: "legal" }));
    expect(business.category).toBe("שירותים");
  });

  it("maps a known archive category to its legacy equivalent", () => {
    const business = mapRegistrationToBusiness(makeRow({ category_id: "food" }));
    expect(business.category).toBe("אוכל");
  });

  it("carries contact and location details into the nested profile fields", () => {
    const business = mapRegistrationToBusiness(makeRow());
    expect(business.contact?.email).toBe("noa@example.com");
    expect(business.location?.address).toBe("רחוב הדקל 4");
    expect(business.location?.serviceArea).toBe("נווה שמיר");
  });
});
