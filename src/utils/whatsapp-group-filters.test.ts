import { describe, expect, it } from "vitest";
import { collectDistinctAudiences, filterWhatsAppGroups, normalizeSearchTerm, sortWhatsAppGroups } from "./whatsapp-group-filters";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";
import { DEFAULT_WHATSAPP_GROUP_FILTERS } from "@/types/whatsapp-group-filters";

function makeGroup(overrides: Partial<WhatsAppGroupRow> = {}): WhatsAppGroupRow {
  return {
    id: "id",
    name: "קבוצת הורים לגן הפרחים",
    description: "עדכונים על הגן",
    invite_url: "https://chat.whatsapp.com/ABCDEFG",
    category: "parents",
    audience: ["הורים"],
    area_or_street: null,
    icon_type: "whatsapp",
    icon_name: null,
    icon_url: null,
    icon_alt: null,
    rules_or_notes: null,
    admin_contact_name: null,
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
    expect(normalizeSearchTerm("  Parents  ")).toBe("parents");
  });
});

describe("filterWhatsAppGroups", () => {
  const entries = [
    makeGroup({ id: "1", name: "הורים כיתה א", description: "עדכוני שיעורי בית", category: "parents", audience: ["הורים"] }),
    makeGroup({ id: "2", name: "מסירה ומכירה שכונתית", description: "פריטים למסירה", category: "marketplace", audience: ["כולם"] }),
    makeGroup({ id: "3", name: "ביטחון רחוב הדקל", description: "עדכוני שיטור שכונתי", category: "security", audience: ["תושבי הרחוב"], area_or_street: "רחוב הדקל" }),
  ];

  it("matches by name", () => {
    const result = filterWhatsAppGroups(entries, { ...DEFAULT_WHATSAPP_GROUP_FILTERS, query: "מסירה" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("matches by description", () => {
    const result = filterWhatsAppGroups(entries, { ...DEFAULT_WHATSAPP_GROUP_FILTERS, query: "שיטור" });
    expect(result.map((e) => e.id)).toEqual(["3"]);
  });

  it("matches by area/street", () => {
    const result = filterWhatsAppGroups(entries, { ...DEFAULT_WHATSAPP_GROUP_FILTERS, query: "הדקל" });
    expect(result.map((e) => e.id)).toEqual(["3"]);
  });

  it("filters by category", () => {
    const result = filterWhatsAppGroups(entries, { ...DEFAULT_WHATSAPP_GROUP_FILTERS, category: "marketplace" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("filters by audience", () => {
    const result = filterWhatsAppGroups(entries, { ...DEFAULT_WHATSAPP_GROUP_FILTERS, audience: "תושבי הרחוב" });
    expect(result.map((e) => e.id)).toEqual(["3"]);
  });

  it("an empty filter returns everything", () => {
    const result = filterWhatsAppGroups(entries, DEFAULT_WHATSAPP_GROUP_FILTERS);
    expect(result).toHaveLength(3);
  });

  it("does not mutate the input array", () => {
    const before = [...entries];
    filterWhatsAppGroups(entries, { ...DEFAULT_WHATSAPP_GROUP_FILTERS, query: "מסירה" });
    expect(entries).toEqual(before);
  });
});

describe("sortWhatsAppGroups", () => {
  it("featured entries come before non-featured, regardless of priority", () => {
    const entries = [makeGroup({ id: "low-priority-featured", priority: 0, featured: true }), makeGroup({ id: "high-priority-not-featured", priority: 99, featured: false })];
    expect(sortWhatsAppGroups(entries).map((e) => e.id)).toEqual(["low-priority-featured", "high-priority-not-featured"]);
  });

  it("within the same featured tier, higher priority comes first", () => {
    const entries = [makeGroup({ id: "low", priority: 1 }), makeGroup({ id: "high", priority: 10 })];
    expect(sortWhatsAppGroups(entries).map((e) => e.id)).toEqual(["high", "low"]);
  });

  it("falls back to alphabetical name order when featured and priority both tie", () => {
    const entries = [makeGroup({ id: "b", name: "קבוצת תושבים", priority: 0 }), makeGroup({ id: "a", name: "אימהות לתינוקות", priority: 0 })];
    expect(sortWhatsAppGroups(entries).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const entries = [makeGroup({ id: "1", priority: 1 }), makeGroup({ id: "2", priority: 5 })];
    const before = [...entries];
    sortWhatsAppGroups(entries);
    expect(entries).toEqual(before);
  });
});

describe("collectDistinctAudiences", () => {
  it("collects unique, trimmed audience tags across groups", () => {
    const entries = [makeGroup({ audience: ["הורים", " ילדים "] }), makeGroup({ audience: ["הורים", "נשים"] })];
    expect(collectDistinctAudiences(entries)).toEqual(["הורים", "ילדים", "נשים"]);
  });

  it("returns an empty array when no group has any audience tag", () => {
    expect(collectDistinctAudiences([makeGroup({ audience: [] })])).toEqual([]);
  });
});
