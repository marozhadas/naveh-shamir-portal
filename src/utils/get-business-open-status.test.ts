import { describe, expect, it } from "vitest";
import { getBusinessOpenStatus } from "./get-business-open-status";
import type { BusinessOpeningHours } from "@/types/business";

// All timestamps below are verified against Asia/Jerusalem local time (see the reasoning trail):
// 2026-06-15T09:30:00Z -> Mon 12:30, 2026-06-15T05:00:00Z -> Mon 08:00,
// 2026-06-15T12:00:00Z -> Mon 15:00, 2026-06-15T20:00:00Z -> Mon 23:00,
// 2026-06-20T06:00:00Z -> Sat 09:00.

const STANDARD_WEEK: BusinessOpeningHours[] = [
  { day: "sunday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
  { day: "monday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
  { day: "tuesday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
  { day: "wednesday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
  { day: "thursday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "18:00" }] },
  { day: "friday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "14:00" }] },
  { day: "saturday", closed: true, intervals: [] },
];

describe("getBusinessOpenStatus", () => {
  it("returns null when there's no opening-hours data at all", () => {
    expect(getBusinessOpenStatus(undefined, new Date())).toBeNull();
    expect(getBusinessOpenStatus([], new Date())).toBeNull();
  });

  it("reports open now when the current time falls inside today's interval", () => {
    const status = getBusinessOpenStatus(STANDARD_WEEK, new Date("2026-06-15T09:30:00.000Z"));
    expect(status).toEqual({ isOpenNow: true, label: "פתוח עכשיו" });
  });

  it("reports 'opens today at HH:mm' before today's opening time", () => {
    const status = getBusinessOpenStatus(STANDARD_WEEK, new Date("2026-06-15T05:00:00.000Z"));
    expect(status).toEqual({ isOpenNow: false, label: "נפתח היום ב־09:00" });
  });

  it("reports closed and points to tomorrow after today's hours have ended", () => {
    const status = getBusinessOpenStatus(STANDARD_WEEK, new Date("2026-06-15T20:00:00.000Z"));
    expect(status).toEqual({ isOpenNow: false, label: "נפתח מחר ב־09:00" });
  });

  it("skips a closed day (Saturday) and points to the next open day (tomorrow, i.e. Sunday)", () => {
    const status = getBusinessOpenStatus(STANDARD_WEEK, new Date("2026-06-20T06:00:00.000Z"));
    expect(status).toEqual({ isOpenNow: false, label: "נפתח מחר ב־09:00" });
  });

  it("points to the day name (not 'tomorrow') when the next open day is more than a day away", () => {
    // Wednesday, with only Sunday and Friday open — the next open day (Friday) is 2 days out.
    const sparseWeek: BusinessOpeningHours[] = [
      { day: "sunday", closed: false, intervals: [{ opensAt: "08:00", closesAt: "14:00" }] },
      { day: "monday", closed: true, intervals: [] },
      { day: "tuesday", closed: true, intervals: [] },
      { day: "wednesday", closed: true, intervals: [] },
      { day: "thursday", closed: true, intervals: [] },
      { day: "friday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "13:00" }] },
      { day: "saturday", closed: true, intervals: [] },
    ];
    const status = getBusinessOpenStatus(sparseWeek, new Date("2026-06-15T12:00:00.000Z"));
    expect(status).toEqual({ isOpenNow: false, label: "נפתח ביום שישי ב־09:00" });
  });

  it("supports two separate intervals in the same day (a lunch break)", () => {
    const twoIntervalDay: BusinessOpeningHours[] = [
      { day: "monday", closed: false, intervals: [{ opensAt: "09:00", closesAt: "13:00" }, { opensAt: "16:00", closesAt: "20:00" }] },
    ];
    const status = getBusinessOpenStatus(twoIntervalDay, new Date("2026-06-15T12:00:00.000Z"));
    expect(status).toEqual({ isOpenNow: false, label: "נפתח היום ב־16:00" });
  });

  it("a fully closed day with no intervals is treated as closed", () => {
    const status = getBusinessOpenStatus(STANDARD_WEEK, new Date("2026-06-20T06:00:00.000Z"));
    expect(status?.isOpenNow).toBe(false);
  });
});
