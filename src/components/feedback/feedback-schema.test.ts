import { describe, expect, it } from "vitest";
import { feedbackSchema, normalizePagePath } from "./feedback-schema";

const valid = { kind: "idea", message: "הצעה מפורטת לשיפור האתר", name: "", email: "" };

describe("feedbackSchema", () => {
  it("accepts a valid anonymous submission (name and email optional)", () => {
    expect(feedbackSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a message shorter than 10 characters", () => {
    expect(feedbackSchema.safeParse({ ...valid, message: "קצר" }).success).toBe(false);
  });

  it("rejects a message over 2000 characters and accepts exactly 2000", () => {
    expect(feedbackSchema.safeParse({ ...valid, message: "א".repeat(2001) }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...valid, message: "א".repeat(2000) }).success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(feedbackSchema.safeParse({ ...valid, kind: "hack" }).success).toBe(false);
  });

  it("validates email only when provided", () => {
    expect(feedbackSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...valid, email: "a@b.co" }).success).toBe(true);
  });
});

describe("normalizePagePath", () => {
  it("keeps a plain path and strips query and hash", () => {
    expect(normalizePagePath("/businesses/x?token=abc#top")).toBe("/businesses/x");
  });

  it("rejects full URLs and protocol-relative paths", () => {
    expect(normalizePagePath("https://evil.example/x")).toBeNull();
    expect(normalizePagePath("//evil.example")).toBeNull();
  });

  it("rejects paths over 300 characters", () => {
    expect(normalizePagePath("/" + "a".repeat(300))).toBeNull();
  });
});
