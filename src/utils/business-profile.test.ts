import { describe, expect, it } from "vitest";
import { getBusinessAddressLine, getBusinessContact, getBusinessDescription, getBusinessHeroImage, getBusinessServiceArea } from "./business-profile";
import type { Business } from "@/types/business";

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "id",
    slug: "slug",
    name: "עסק",
    category: "שירותים",
    description: "תיאור קצר",
    imageUrl: "/images/flat.jpg",
    imageAlt: "תמונה שטוחה",
    ...overrides,
  };
}

describe("getBusinessHeroImage", () => {
  it("prefers the nested `image` field when present", () => {
    const business = makeBusiness({ image: { src: "/images/full.jpg", alt: "תמונה מלאה" } });
    expect(getBusinessHeroImage(business)).toEqual({ src: "/images/full.jpg", alt: "תמונה מלאה" });
  });

  it("falls back to the flat imageUrl/imageAlt fields", () => {
    expect(getBusinessHeroImage(makeBusiness())).toEqual({ src: "/images/flat.jpg", alt: "תמונה שטוחה" });
  });
});

describe("getBusinessContact", () => {
  it("prefers nested contact fields over the flat ones", () => {
    const business = makeBusiness({ phone: "tel:+9721", contact: { phone: "tel:+9722" } });
    expect(getBusinessContact(business).phone).toBe("tel:+9722");
  });

  it("falls back to the flat fields when contact isn't set", () => {
    const business = makeBusiness({ phone: "tel:+9721", whatsappUrl: "https://wa.me/9721" });
    expect(getBusinessContact(business)).toEqual({
      phone: "tel:+9721",
      whatsappUrl: "https://wa.me/9721",
      email: undefined,
      websiteUrl: undefined,
    });
  });
});

describe("getBusinessAddressLine / getBusinessServiceArea", () => {
  it("prefers the nested location over the flat fields", () => {
    const business = makeBusiness({ address: "flat address", location: { neighborhood: "נווה שמיר", address: "nested address" } });
    expect(getBusinessAddressLine(business)).toBe("nested address");
  });

  it("falls back to the flat fields", () => {
    const business = makeBusiness({ address: "flat address", serviceArea: "flat area" });
    expect(getBusinessAddressLine(business)).toBe("flat address");
    expect(getBusinessServiceArea(business)).toBe("flat area");
  });
});

describe("getBusinessDescription", () => {
  it("prefers fullDescription when present", () => {
    expect(getBusinessDescription(makeBusiness({ fullDescription: "תיאור מלא" }))).toBe("תיאור מלא");
  });

  it("falls back to the short description field", () => {
    expect(getBusinessDescription(makeBusiness())).toBe("תיאור קצר");
  });
});
