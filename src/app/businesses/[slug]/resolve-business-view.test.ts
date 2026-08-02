import { describe, expect, it, vi } from "vitest";

// resolve-business-view.ts transitively imports "server-only"-guarded repository modules —
// stubbed the same way src/app/business/register/actions.test.ts does. This file only exercises
// normalizeSlug(), a pure function with no Supabase/next-headers dependency.
vi.mock("server-only", () => ({}));

const { normalizeSlug } = await import("./resolve-business-view");

describe("normalizeSlug", () => {
  it("leaves an already-decoded Hebrew slug untouched", () => {
    expect(normalizeSlug("עסק-בדיקה-זרימת-ניסיון")).toBe("עסק-בדיקה-זרימת-ניסיון");
  });

  it("leaves a plain ASCII slug untouched", () => {
    expect(normalizeSlug("mitbach-shel-roni")).toBe("mitbach-shel-roni");
  });

  it("decodes a percent-encoded Hebrew slug — Next handed the page component this form for a real (non-ASCII) slug in a bug this guards against", () => {
    expect(normalizeSlug("%D7%A2%D7%A1%D7%A7-%D7%91%D7%93%D7%99%D7%A7%D7%94")).toBe("עסק-בדיקה");
  });

  it("falls back to the raw input instead of throwing on a malformed percent-sequence", () => {
    expect(normalizeSlug("100%-off-%zz")).toBe("100%-off-%zz");
  });
});
