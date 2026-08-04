const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("he-IL", { weekday: "long", timeZone: "Asia/Jerusalem" });
const DATE_FORMATTER = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" });
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "Asia/Jerusalem" });
const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat("he-IL", { day: "numeric", timeZone: "Asia/Jerusalem" });
const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat("he-IL", { month: "short", timeZone: "Asia/Jerusalem" });

/** `event_date` is a plain "YYYY-MM-DD" calendar date with no time component, so parsing it at UTC noon is safe regardless of the reader's timezone — it can never roll to the adjacent day. */
export function parseEventDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Just the day-of-month, e.g. "12" — for the homepage teaser's date badge. */
export function formatEventDayNumber(isoDate: string): string {
  return DAY_NUMBER_FORMATTER.format(parseEventDate(isoDate));
}

/** Short month name, e.g. "אוג׳" — for the homepage teaser's date badge. */
export function formatEventMonthShort(isoDate: string): string {
  return MONTH_SHORT_FORMATTER.format(parseEventDate(isoDate));
}

export function formatEventWeekday(isoDate: string): string {
  return WEEKDAY_FORMATTER.format(parseEventDate(isoDate));
}

export function formatEventDateFull(isoDate: string): string {
  return DATE_FORMATTER.format(parseEventDate(isoDate));
}

export function formatEventDateShort(isoDate: string): string {
  return SHORT_DATE_FORMATTER.format(parseEventDate(isoDate));
}

/** "HH:MM" from a "HH:MM:SS" (or "HH:MM") time-of-day string — no timezone conversion, it's a plain wall-clock time. */
export function formatEventTime(time: string): string {
  return time.slice(0, 5);
}

export function formatEventTimeRange(startTime: string, endTime: string | null): string {
  return endTime ? `${formatEventTime(startTime)}–${formatEventTime(endTime)}` : formatEventTime(startTime);
}
