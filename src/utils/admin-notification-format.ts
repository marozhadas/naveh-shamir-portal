/** Caps a badge count display at "99+" rather than growing the pill indefinitely. */
export function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function formatNotificationDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("he-IL", { numeric: "auto" });

/** "לפני 5 דקות" style relative time, falling back to an absolute date beyond a week. */
export function formatRelativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 1) return "עכשיו";
  if (Math.abs(diffMinutes) < 60) return RELATIVE_TIME_FORMATTER.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return RELATIVE_TIME_FORMATTER.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return RELATIVE_TIME_FORMATTER.format(diffDays, "day");

  return formatNotificationDateTime(iso);
}
