import { describe, expect, it } from "vitest";
import { plusBusinessRegistrationSchema, WEEKDAYS } from "./schema";

function makeValidInput(overrides: Record<string, unknown> = {}) {
  return {
    registrationId: "11111111-1111-1111-1111-111111111111",
    planId: "plus",
    businessName: "מספרת קו הבית",
    categoryIds: ["beauty"],
    businessType: "service-provider",
    contactName: "נועה כהן",
    contactPhone: "0501234567",
    contactEmail: "noa@example.com",
    publicPhone: "0501234567",
    publicWhatsapp: "0501234567",
    publicEmail: "",
    shortDescription: "מספרה שכונתית לכל המשפחה",
    fullDescription: "מספרה שכונתית לכל המשפחה עם ניסיון של שנים רבות, מציעה טיפולי שיער איכותיים ושירות אישי לכל לקוח ולקוחה בסביבה נעימה וביתית.",
    addressType: "physical",
    address: "רחוב הדקל 4",
    serviceArea: "",
    coverImage: { url: "https://example.com/cover.jpg", alt: "תמונה ראשית" },
    gallery: [],
    services: [{ title: "תספורת", description: "", priceLabel: "150 ₪" }],
    openingHours: WEEKDAYS.map((day) => ({ day, closed: day === "saturday", intervals: day === "saturday" ? [] : [{ opensAt: "09:00", closesAt: "18:00" }] })),
    websiteUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    promotion: null,
    publicationConsent: true,
    termsAccepted: true,
    trialConsent: true,
    ...overrides,
  };
}

describe("plusBusinessRegistrationSchema", () => {
  it("accepts a fully valid Plus registration", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput());
    expect(result.success).toBe(true);
  });

  it("rejects planId values other than plus/premium", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ planId: "free" }));
    expect(result.success).toBe(false);
  });

  it("requires at least one category", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ categoryIds: [] }));
    expect(result.success).toBe(false);
  });

  it("requires a cover image", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ coverImage: undefined }));
    expect(result.success).toBe(false);
  });

  it("requires at least one service", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ services: [] }));
    expect(result.success).toBe(false);
  });

  it("rejects a full description shorter than 100 characters", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ fullDescription: "תיאור קצר מדי" }));
    expect(result.success).toBe(false);
  });

  it("requires all 7 weekdays in openingHours", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ openingHours: [] }));
    expect(result.success).toBe(false);
  });

  it("rejects an opening-hours interval where closesAt is before opensAt", () => {
    const badHours = WEEKDAYS.map((day) => ({ day, closed: false, intervals: [{ opensAt: "18:00", closesAt: "09:00" }] }));
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ openingHours: badHours }));
    expect(result.success).toBe(false);
  });

  it("rejects more than 7 gallery images (8 total including cover)", () => {
    const gallery = Array.from({ length: 8 }, (_, i) => ({ url: `https://example.com/${i}.jpg`, alt: "", order: i }));
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ gallery }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ contactPhone: "abc" }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ contactEmail: "not-an-email" }));
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe website URL", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ websiteUrl: "javascript:alert(1)" }));
    expect(result.success).toBe(false);
  });

  it("requires address when addressType is physical", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ addressType: "physical", address: "" }));
    expect(result.success).toBe(false);
  });

  it("requires serviceArea when addressType is service-area", () => {
    const result = plusBusinessRegistrationSchema.safeParse(makeValidInput({ addressType: "service-area", address: "", serviceArea: "" }));
    expect(result.success).toBe(false);
  });

  it("requires all three consent checkboxes to be true", () => {
    expect(plusBusinessRegistrationSchema.safeParse(makeValidInput({ publicationConsent: false })).success).toBe(false);
    expect(plusBusinessRegistrationSchema.safeParse(makeValidInput({ termsAccepted: false })).success).toBe(false);
    expect(plusBusinessRegistrationSchema.safeParse(makeValidInput({ trialConsent: false })).success).toBe(false);
  });
});
