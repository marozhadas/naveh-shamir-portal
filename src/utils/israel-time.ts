/**
 * Event dates and times are stored as Israel LOCAL wall-clock values ("2026-10-12" + "17:00:00"). Structured data must
 * state the real offset for that moment — Israel is UTC+2 in winter and UTC+3 during daylight saving, so a fixed
 * "+03:00" would be wrong for half the year.
 */

const ZONE = "Asia/Jerusalem";

const FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function wallClock(instantMs: number): string {
  const parts = FORMATTER.formatToParts(new Date(instantMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

function normalizeTime(time: string): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(time.trim());
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`;
}

/** "+02:00" / "+03:00" for the given Israel local date ("YYYY-MM-DD") and time, or null if the input is not a valid date/time. */
export function israelUtcOffset(date: string, time: string): string | null {
  const t = normalizeTime(time);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const local = `${date}T${t}`;
  const asIfUtc = Date.parse(`${local}Z`);
  if (Number.isNaN(asIfUtc)) return null;
  // Israel is only ever UTC+2 or UTC+3: the right offset is the one whose instant shows exactly this wall-clock time.
  for (const hours of [2, 3]) {
    if (wallClock(asIfUtc - hours * 3_600_000) === local) return `+0${hours}:00`;
  }
  // A wall-clock time that does not exist (the spring-forward gap): fall back to the offset in force before the change.
  return "+02:00";
}

/** "2026-10-12T17:00:00+03:00" — the local time with its true Israel offset; the local text itself is never changed. */
export function toIsraelIsoDateTime(date: string, time: string): string | null {
  const offset = israelUtcOffset(date, time);
  const t = normalizeTime(time);
  return offset && t ? `${date}T${t}${offset}` : null;
}
