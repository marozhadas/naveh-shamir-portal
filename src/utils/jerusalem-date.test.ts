import { describe, expect, it } from "vitest";
import { resolveEventDateRange, todayInJerusalem } from "./jerusalem-date";

// A fixed instant: 2026-08-04T22:30:00Z is already 2026-08-05 01:30 in Asia/Jerusalem (UTC+3 in
// August) — everything below is anchored to the Jerusalem calendar date, not the UTC one, so this
// deliberately straddles a day boundary to prove the timezone conversion actually happens.
const AUGUST_TUESDAY_NIGHT_UTC = new Date("2026-08-04T22:30:00Z"); // Jerusalem: Wed 2026-08-05

describe("todayInJerusalem", () => {
  it("resolves to the Jerusalem calendar date, not the UTC one", () => {
    expect(todayInJerusalem(AUGUST_TUESDAY_NIGHT_UTC)).toBe("2026-08-05");
  });

  it("never rolls over using local/server time — only the injected `now` and Asia/Jerusalem matter", () => {
    const utcMorning = new Date("2026-01-10T04:00:00Z"); // Jerusalem: Sat 2026-01-10 06:00 (UTC+2 in winter)
    expect(todayInJerusalem(utcMorning)).toBe("2026-01-10");
  });
});

describe("resolveEventDateRange", () => {
  it("today: a single-day range on the Jerusalem date", () => {
    expect(resolveEventDateRange("today", AUGUST_TUESDAY_NIGHT_UTC)).toEqual({ start: "2026-08-05", end: "2026-08-05" });
  });

  it("tomorrow: a single-day range one day after today", () => {
    expect(resolveEventDateRange("tomorrow", AUGUST_TUESDAY_NIGHT_UTC)).toEqual({ start: "2026-08-06", end: "2026-08-06" });
  });

  it("this-week: today through the coming Saturday (Israeli week, Sunday–Saturday)", () => {
    // 2026-08-05 is a Wednesday.
    expect(resolveEventDateRange("this-week", AUGUST_TUESDAY_NIGHT_UTC)).toEqual({ start: "2026-08-05", end: "2026-08-08" });
  });

  it("this-week starting on a Sunday spans the full week", () => {
    const sunday = new Date("2026-08-02T10:00:00Z"); // Jerusalem: Sun 2026-08-02
    expect(resolveEventDateRange("this-week", sunday)).toEqual({ start: "2026-08-02", end: "2026-08-08" });
  });

  it("this-weekend: always Friday–Saturday, even mid-week", () => {
    expect(resolveEventDateRange("this-weekend", AUGUST_TUESDAY_NIGHT_UTC)).toEqual({ start: "2026-08-07", end: "2026-08-08" });
  });

  it("this-weekend when today already is Saturday: only today remains, not next week's Friday–Saturday", () => {
    const saturday = new Date("2026-08-08T10:00:00Z"); // Jerusalem: Sat 2026-08-08
    expect(resolveEventDateRange("this-weekend", saturday)).toEqual({ start: "2026-08-08", end: "2026-08-08" });
  });

  it("this-month: today through the last calendar day of the month", () => {
    expect(resolveEventDateRange("this-month", AUGUST_TUESDAY_NIGHT_UTC)).toEqual({ start: "2026-08-05", end: "2026-08-31" });
  });

  it("this-month correctly resolves a short month (February)", () => {
    const feb = new Date("2026-02-10T10:00:00Z");
    expect(resolveEventDateRange("this-month", feb)).toEqual({ start: "2026-02-10", end: "2026-02-28" });
  });

  it("custom: an explicit single day, ignoring `now`", () => {
    expect(resolveEventDateRange("custom", AUGUST_TUESDAY_NIGHT_UTC, "2026-12-25")).toEqual({ start: "2026-12-25", end: "2026-12-25" });
  });

  it("custom falls back to today when no date is supplied", () => {
    expect(resolveEventDateRange("custom", AUGUST_TUESDAY_NIGHT_UTC)).toEqual({ start: "2026-08-05", end: "2026-08-05" });
  });

  it("past: unbounded start through yesterday — never includes today", () => {
    const range = resolveEventDateRange("past", AUGUST_TUESDAY_NIGHT_UTC);
    expect(range.end).toBe("2026-08-04");
    expect(range.start < range.end!).toBe(true);
  });

  it("all-upcoming: today onward, unbounded end", () => {
    expect(resolveEventDateRange("all-upcoming", AUGUST_TUESDAY_NIGHT_UTC)).toEqual({ start: "2026-08-05", end: null });
  });
});
