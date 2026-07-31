import { describe, expect, it } from "vitest";
import { createLocalBusinessStructuredData } from "./create-local-business-json-ld";
import type { Business } from "@/types/business";

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "id",
    slug: "studio-noa",
    name: "סטודיו נועה",
    category: "שירותים",
    description: "תיאור קצר",
    imageUrl: "/images/businesses/studio.jpg",
    imageAlt: "סטודיו",
    ...overrides,
  };
}

describe("createLocalBusinessStructuredData", () => {
  it("includes only name/url/type for a minimal business", () => {
    const data = createLocalBusinessStructuredData(makeBusiness({ description: "", imageUrl: "", imageAlt: "" }));
    expect(data["@type"]).toBe("LocalBusiness");
    expect(data.name).toBe("סטודיו נועה");
    expect(data.url).toContain("/businesses/studio-noa");
    expect(data.telephone).toBeUndefined();
    expect(data.address).toBeUndefined();
    expect(data.openingHoursSpecification).toBeUndefined();
    expect(data.sameAs).toBeUndefined();
  });

  it("strips the tel: prefix from the phone number", () => {
    const data = createLocalBusinessStructuredData(makeBusiness({ phone: "tel:+972500000001" }));
    expect(data.telephone).toBe("+972500000001");
  });

  it("includes address only when location data exists", () => {
    const data = createLocalBusinessStructuredData(
      makeBusiness({ location: { neighborhood: "נווה שמיר", address: "רחוב הדקל 4", city: "תל אביב" } }),
    );
    expect(data.address).toEqual({ "@type": "PostalAddress", streetAddress: "רחוב הדקל 4", addressLocality: "תל אביב" });
  });

  it("includes opening hours only for non-closed days", () => {
    const data = createLocalBusinessStructuredData(
      makeBusiness({
        openingHours: [
          { day: "sunday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
          { day: "saturday", closed: true, intervals: [] },
        ],
      }),
    );
    expect(data.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "09:00", closes: "18:00" },
    ]);
  });

  it("includes only non-empty social links in sameAs", () => {
    const data = createLocalBusinessStructuredData(
      makeBusiness({ socialLinks: { instagram: "https://instagram.com/studionoa", facebook: undefined } }),
    );
    expect(data.sameAs).toEqual(["https://instagram.com/studionoa"]);
  });

  it("never fabricates aggregateRating or fields not present on the business", () => {
    const data = createLocalBusinessStructuredData(makeBusiness());
    expect(data).not.toHaveProperty("aggregateRating");
    expect(data).not.toHaveProperty("priceRange");
  });
});
