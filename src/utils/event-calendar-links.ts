import type { CommunityEventRow } from "@/types/community-event";

type CalendarEventInput = Pick<CommunityEventRow, "title" | "short_description" | "event_date" | "start_time" | "end_time" | "location_name">;

function compactDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(/:/g, "").slice(0, 6)}`;
}

/** Assumes a 1-hour duration when the event has no end time — Google Calendar requires an end. */
function resolveEndTime(startTime: string, endTime: string | null): string {
  if (endTime) return endTime;
  const [hours, minutes, seconds] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + 60;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:${String(seconds ?? 0).padStart(2, "0")}`;
}

/** `ctz=Asia/Jerusalem` tells Google Calendar to interpret the (timezone-less) dates param as Israel local time, not UTC. */
export function buildGoogleCalendarUrl(event: CalendarEventInput, pageUrl: string): string {
  const endTime = resolveEndTime(event.start_time, event.end_time);
  const dates = `${compactDateTime(event.event_date, event.start_time)}/${compactDateTime(event.event_date, endTime)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: `${event.short_description}\n\n${pageUrl}`,
    location: event.location_name,
    ctz: "Asia/Jerusalem",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * A minimal, valid .ics file — TZID references "Asia/Jerusalem" directly rather than embedding a
 * full VTIMEZONE block (which every major calendar client, including Google/Outlook/Apple,
 * resolves correctly via the IANA tz database without it); a deliberate scope trade-off, not an
 * oversight.
 */
export function buildIcsContent(event: CalendarEventInput, pageUrl: string, uid: string): string {
  const endTime = resolveEndTime(event.start_time, event.end_time);
  const dtStamp = `${todayCompact()}T000000Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Neve Shamir Portal//Events//HE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Jerusalem:${compactDateTime(event.event_date, event.start_time)}`,
    `DTEND;TZID=Asia/Jerusalem:${compactDateTime(event.event_date, endTime)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(`${event.short_description}\n\n${pageUrl}`)}`,
    `LOCATION:${escapeIcsText(event.location_name)}`,
    `URL:${pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function todayCompact(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
