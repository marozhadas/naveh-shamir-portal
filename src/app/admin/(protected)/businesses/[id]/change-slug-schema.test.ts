import { describe, expect, it } from "vitest";
import { changeBusinessSlugSchema } from "./change-slug-schema";

describe("changeBusinessSlugSchema", () => {
  it("accepts a valid businessId + English slug", () => {
    const result = changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "ronis-kitchen" });
    expect(result.success).toBe(true);
  });

  it("rejects a Hebrew slug", () => {
    const result = changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "המטבח-של-רוני" });
    expect(result.success).toBe(false);
  });

  it("rejects an uppercase slug", () => {
    const result = changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "Roni-Kitchen" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with spaces", () => {
    const result = changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "roni kitchen" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with an underscore", () => {
    const result = changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "roni_kitchen" });
    expect(result.success).toBe(false);
  });

  it("rejects a leading hyphen", () => {
    expect(changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "-roni" }).success).toBe(false);
  });

  it("rejects a trailing hyphen", () => {
    expect(changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "roni-" }).success).toBe(false);
  });

  it("rejects a double hyphen", () => {
    expect(changeBusinessSlugSchema.safeParse({ businessId: "b1", newSlug: "roni--kitchen" }).success).toBe(false);
  });

  it("rejects an empty businessId", () => {
    const result = changeBusinessSlugSchema.safeParse({ businessId: "", newSlug: "ronis-kitchen" });
    expect(result.success).toBe(false);
  });
});
