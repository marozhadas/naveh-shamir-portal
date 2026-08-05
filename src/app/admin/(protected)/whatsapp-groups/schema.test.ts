import { describe, expect, it } from "vitest";
import { EMPTY_WHATSAPP_GROUP_FORM_VALUES, parseAudienceInput, whatsAppGroupFormSchema } from "./schema";
import type { WhatsAppGroupFormValues } from "./schema";

function makeValues(overrides: Partial<WhatsAppGroupFormValues> = {}): WhatsAppGroupFormValues {
  return {
    ...EMPTY_WHATSAPP_GROUP_FORM_VALUES,
    name: "קבוצת הורים",
    category: "parents",
    inviteUrl: "https://chat.whatsapp.com/ABCDEFG12345",
    ...overrides,
  };
}

function issuesFor(values: WhatsAppGroupFormValues, path: string): string[] {
  const result = whatsAppGroupFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path.join(".") === path).map((i) => i.message);
}

describe("whatsAppGroupFormSchema", () => {
  it("accepts a minimal valid entry", () => {
    expect(whatsAppGroupFormSchema.safeParse(makeValues()).success).toBe(true);
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

  it("rejects an empty invite URL", () => {
    expect(issuesFor(makeValues({ inviteUrl: "" }), "inviteUrl").length).toBeGreaterThan(0);
  });

  it("rejects a non-WhatsApp invite URL", () => {
    expect(issuesFor(makeValues({ inviteUrl: "https://example.com/group" }), "inviteUrl").length).toBeGreaterThan(0);
  });

  it("rejects a javascript: invite URL", () => {
    expect(issuesFor(makeValues({ inviteUrl: "javascript:alert(1)" }), "inviteUrl").length).toBeGreaterThan(0);
  });

  it("accepts a valid wa.me invite URL", () => {
    expect(whatsAppGroupFormSchema.safeParse(makeValues({ inviteUrl: "https://wa.me/972500000000" })).success).toBe(true);
  });

  it("rejects an icon name that isn't in the allowlist", () => {
    expect(issuesFor(makeValues({ iconType: "lucide", iconName: "SomeMadeUpIcon" }), "iconName").length).toBeGreaterThan(0);
  });

  it("accepts a known icon name", () => {
    expect(whatsAppGroupFormSchema.safeParse(makeValues({ iconType: "lucide", iconName: "Users" })).success).toBe(true);
  });

  it("requires alt text for a custom-image icon", () => {
    expect(issuesFor(makeValues({ iconType: "custom-image", iconAlt: "" }), "iconAlt").length).toBeGreaterThan(0);
  });

  it("accepts a custom-image icon with alt text", () => {
    expect(whatsAppGroupFormSchema.safeParse(makeValues({ iconType: "custom-image", iconAlt: "לוגו הקבוצה" })).success).toBe(true);
  });

  it("defaults to the whatsapp icon type and accepts it without a name", () => {
    expect(whatsAppGroupFormSchema.safeParse(makeValues({ iconType: "whatsapp" })).success).toBe(true);
  });

  it("rejects a non-numeric priority", () => {
    expect(issuesFor(makeValues({ priority: "not-a-number" }), "priority").length).toBeGreaterThan(0);
  });

  it("accepts a numeric priority", () => {
    expect(whatsAppGroupFormSchema.safeParse(makeValues({ priority: "5" })).success).toBe(true);
  });
});

describe("parseAudienceInput", () => {
  it("splits a comma-separated string into a trimmed array", () => {
    expect(parseAudienceInput("הורים, ילדים ,  נשים")).toEqual(["הורים", "ילדים", "נשים"]);
  });

  it("drops empty entries", () => {
    expect(parseAudienceInput("הורים,, ,ילדים")).toEqual(["הורים", "ילדים"]);
  });

  it("dedupes repeated tags", () => {
    expect(parseAudienceInput("הורים, הורים")).toEqual(["הורים"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseAudienceInput("")).toEqual([]);
  });
});
