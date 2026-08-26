const DATE_FORMATTER = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" });

/** `publishedAt`/`createdAt` are full ISO timestamps (unlike an event's plain "YYYY-MM-DD" date), so this parses directly with `new Date`. */
export function formatNewsDateFull(isoTimestamp: string): string {
  return DATE_FORMATTER.format(new Date(isoTimestamp));
}
