const TIME_ZONE = "Asia/Jerusalem";

/** "YYYY-MM-DD" in Asia/Jerusalem — never the server's or browser's local timezone (spec requirement). */
export function todayInJerusalem(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  // Noon UTC avoids any DST-adjacent date-shift when adding/subtracting whole days.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 0 (Sunday) – 6 (Saturday), matching the Israeli week — computed from the date string alone, no timezone conversion needed since it's already a plain calendar date. */
function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

export type EventDateFilter = "all-upcoming" | "today" | "tomorrow" | "this-week" | "this-weekend" | "this-month" | "custom" | "past";

export type DateRange = { start: string; end: string | null };

/**
 * Resolves a named (or custom) filter into an inclusive [start, end] date range in Jerusalem's
 * calendar — `end: null` means unbounded (open-ended into the future). The Israeli week runs
 * Sunday–Saturday and "weekend" is Friday–Saturday.
 */
export function resolveEventDateRange(filter: EventDateFilter, now: Date = new Date(), customDate?: string): DateRange {
  const today = todayInJerusalem(now);

  switch (filter) {
    case "today":
      return { start: today, end: today };
    case "tomorrow": {
      const tomorrow = addDays(today, 1);
      return { start: tomorrow, end: tomorrow };
    }
    case "this-week": {
      const weekday = weekdayOf(today);
      const weekEnd = addDays(today, 6 - weekday);
      return { start: today, end: weekEnd };
    }
    case "this-weekend": {
      const weekday = weekdayOf(today);
      // If today is already Saturday, Friday has passed — the weekend's only remaining day is today,
      // not next week's (the plain "days until the next Friday" formula would otherwise skip forward).
      if (weekday === 6) return { start: today, end: today };
      const daysUntilFriday = (5 - weekday + 7) % 7;
      const friday = addDays(today, daysUntilFriday);
      const saturday = addDays(friday, 1);
      return { start: friday, end: saturday };
    }
    case "this-month": {
      const [year, month] = today.split("-");
      const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
      return { start: today, end: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
    }
    case "custom":
      return { start: customDate ?? today, end: customDate ?? today };
    case "past":
      return { start: "0001-01-01", end: addDays(today, -1) };
    case "all-upcoming":
    default:
      return { start: today, end: null };
  }
}
