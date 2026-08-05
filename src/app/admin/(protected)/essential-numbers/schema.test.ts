import { describe, expect, it } from "vitest";
import { EMPTY_ESSENTIAL_NUMBER_FORM_VALUES, essentialNumberFormSchema } from "./schema";
import type { EssentialNumberFormValues } from "./schema";

function makeValues(overrides: Partial<EssentialNumberFormValues> = {}): EssentialNumberFormValues {
  return {
    ...EMPTY_ESSENTIAL_NUMBER_FORM_VALUES,
    name: "מוקד עירוני",
    category: "municipality",
    phone: "106",
    displayPhone: "106",
    ...overrides,
  };
}

function issuesFor(values: EssentialNumberFormValues, path: string): string[] {
  const result = essentialNumberFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path.join(".") === path).map((i) => i.message);
}

describe("essentialNumberFormSchema", () => {
  it("accepts a minimal valid entry", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues()).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(issuesFor(makeValues({ name: "" }), "name").length).toBeGreaterThan(0);
  });

  it("requires a category", () => {
    expect(issuesFor(makeValues({ category: "" }), "category").length).toBeGreaterThan(0);
  });

  it("rejects an unknown category", () => {
    expect(issuesFor(makeValues({ category: "not-a-real-category" }), "category").length).toBeGreaterThan(0);
  });

  it("rejects an empty phone", () => {
    expect(issuesFor(makeValues({ phone: "" }), "phone").length).toBeGreaterThan(0);
  });

  it("rejects a phone with letters", () => {
    expect(issuesFor(makeValues({ phone: "abc" }), "phone").length).toBeGreaterThan(0);
  });

  it("accepts a short municipal number", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ phone: "106", displayPhone: "106" })).success).toBe(true);
  });

  it("accepts a full international number", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ phone: "+972-2-999-9999", displayPhone: "02-9999999" })).success).toBe(true);
  });

  it("requires displayPhone", () => {
    expect(issuesFor(makeValues({ displayPhone: "" }), "displayPhone").length).toBeGreaterThan(0);
  });

  it("rejects an invalid whatsapp number", () => {
    expect(issuesFor(makeValues({ whatsapp: "not a number" }), "whatsapp").length).toBeGreaterThan(0);
  });

  it("accepts a valid whatsapp number", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ whatsapp: "+972501234567" })).success).toBe(true);
  });

  it("rejects an unsafe website link", () => {
    expect(issuesFor(makeValues({ websiteUrl: "javascript:alert(1)" }), "websiteUrl").length).toBeGreaterThan(0);
  });

  it("accepts a valid https website link", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ websiteUrl: "https://example.gov.il" })).success).toBe(true);
  });

  it("rejects an icon name that isn't in the allowlist", () => {
    expect(issuesFor(makeValues({ iconType: "lucide", iconName: "SomeMadeUpIcon" }), "iconName").length).toBeGreaterThan(0);
  });

  it("accepts a known icon name", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ iconType: "lucide", iconName: "Ambulance" })).success).toBe(true);
  });

  it("accepts no icon at all", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ iconType: "lucide", iconName: "" })).success).toBe(true);
  });

  it("requires alt text for a custom-image icon", () => {
    expect(issuesFor(makeValues({ iconType: "custom-image", iconAlt: "" }), "iconAlt").length).toBeGreaterThan(0);
  });

  it("accepts a custom-image icon with alt text", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ iconType: "custom-image", iconAlt: "לוגו מגן דוד אדום" })).success).toBe(true);
  });

  it("rejects a non-numeric priority", () => {
    expect(issuesFor(makeValues({ priority: "not-a-number" }), "priority").length).toBeGreaterThan(0);
  });

  it("accepts a numeric priority", () => {
    expect(essentialNumberFormSchema.safeParse(makeValues({ priority: "5" })).success).toBe(true);
  });
});
