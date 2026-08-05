import { describe, expect, it } from "vitest";
import { filterEssentialNumbers, normalizeSearchTerm, sortEssentialNumbers } from "./essential-number-filters";
import type { EssentialNumberRow } from "@/types/essential-number";
import { DEFAULT_ESSENTIAL_NUMBER_FILTERS } from "@/types/essential-number-filters";

function makeEntry(overrides: Partial<EssentialNumberRow> = {}): EssentialNumberRow {
  return {
    id: "id",
    name: "מוקד עירוני",
    description: "פניות ותקלות",
    phone: "106",
    display_phone: "106",
    whatsapp: null,
    website_url: null,
    category: "municipality",
    icon_type: "lucide",
    icon_name: "Building2",
    icon_url: null,
    icon_alt: null,
    icon_tone: "blue",
    opening_hours: null,
    notes: null,
    priority: 0,
    featured: false,
    status: "published",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

describe("normalizeSearchTerm", () => {
  it("trims and lowercases", () => {
    expect(normalizeSearchTerm("  Magen  ")).toBe("magen");
  });
});

describe("filterEssentialNumbers", () => {
  const entries = [
    makeEntry({ id: "1", name: "מגן דוד אדום", description: "חירום רפואי", category: "emergency" }),
    makeEntry({ id: "2", name: "תחנת משטרה", description: "ביטחון השכונה", category: "security" }),
    makeEntry({ id: "3", name: "בית ספר יסודי", description: "מזכירות בית הספר", category: "education" }),
  ];

  it("matches by name", () => {
    const result = filterEssentialNumbers(entries, { ...DEFAULT_ESSENTIAL_NUMBER_FILTERS, query: "משטרה" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("matches by description", () => {
    const result = filterEssentialNumbers(entries, { ...DEFAULT_ESSENTIAL_NUMBER_FILTERS, query: "מזכירות" });
    expect(result.map((e) => e.id)).toEqual(["3"]);
  });

  it("matches by category label", () => {
    const result = filterEssentialNumbers(entries, { ...DEFAULT_ESSENTIAL_NUMBER_FILTERS, query: "חינוך" });
    expect(result.map((e) => e.id)).toEqual(["3"]);
  });

  it("filters by category", () => {
    const result = filterEssentialNumbers(entries, { ...DEFAULT_ESSENTIAL_NUMBER_FILTERS, category: "emergency" });
    expect(result.map((e) => e.id)).toEqual(["1"]);
  });

  it("an empty filter returns everything", () => {
    const result = filterEssentialNumbers(entries, DEFAULT_ESSENTIAL_NUMBER_FILTERS);
    expect(result).toHaveLength(3);
  });

  it("combines query and category", () => {
    const result = filterEssentialNumbers(entries, { ...DEFAULT_ESSENTIAL_NUMBER_FILTERS, query: "דוד", category: "emergency" });
    expect(result.map((e) => e.id)).toEqual(["1"]);
  });

  it("does not mutate the input array", () => {
    const before = [...entries];
    filterEssentialNumbers(entries, { ...DEFAULT_ESSENTIAL_NUMBER_FILTERS, query: "משטרה" });
    expect(entries).toEqual(before);
  });
});

describe("sortEssentialNumbers", () => {
  it("featured entries come before non-featured, regardless of priority", () => {
    const entries = [makeEntry({ id: "low-priority-featured", priority: 0, featured: true }), makeEntry({ id: "high-priority-not-featured", priority: 99, featured: false })];
    expect(sortEssentialNumbers(entries).map((e) => e.id)).toEqual(["low-priority-featured", "high-priority-not-featured"]);
  });

  it("within the same featured tier, higher priority comes first", () => {
    const entries = [makeEntry({ id: "low", priority: 1 }), makeEntry({ id: "high", priority: 10 })];
    expect(sortEssentialNumbers(entries).map((e) => e.id)).toEqual(["high", "low"]);
  });

  it("falls back to alphabetical name order when featured and priority both tie", () => {
    const entries = [makeEntry({ id: "b", name: "תחנת משטרה", priority: 0 }), makeEntry({ id: "a", name: "בית חולים", priority: 0 })];
    expect(sortEssentialNumbers(entries).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const entries = [makeEntry({ id: "1", priority: 1 }), makeEntry({ id: "2", priority: 5 })];
    const before = [...entries];
    sortEssentialNumbers(entries);
    expect(entries).toEqual(before);
  });
});
