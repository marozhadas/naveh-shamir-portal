import type { BusinessOpeningHours, Weekday } from "@/types/business";

const TIMEZONE = "Asia/Jerusalem";

const WEEKDAY_ORDER: Weekday[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  sunday: "יום ראשון",
  monday: "יום שני",
  tuesday: "יום שלישי",
  wednesday: "יום רביעי",
  thursday: "יום חמישי",
  friday: "יום שישי",
  saturday: "שבת",
};

const INTL_WEEKDAY_TO_WEEKDAY: Record<string, Weekday> = {
  Sun: "sunday",
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
};

export type BusinessOpenStatus = {
  isOpenNow: boolean;
  label: string;
};

/** Current weekday + "HH:mm" in Asia/Jerusalem, independent of the server/browser's own timezone. */
function getZonedNow(now: Date): { weekday: Weekday; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekdayPart = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minutePart = parts.find((part) => part.type === "minute")?.value ?? "00";

  return { weekday: INTL_WEEKDAY_TO_WEEKDAY[weekdayPart] ?? "sunday", time: `${hourPart}:${minutePart}` };
}

function findDay(hours: BusinessOpeningHours[], day: Weekday): BusinessOpeningHours | undefined {
  return hours.find((entry) => entry.day === day);
}

/** Today's weekday in Asia/Jerusalem — exported for UI code that needs to highlight "today" (e.g. the opening-hours list) without duplicating the timezone logic. */
export function getIsraelWeekday(now: Date): Weekday {
  return getZonedNow(now).weekday;
}

/**
 * Computes live open/closed status from structured opening hours (never by comparing raw
 * strings) using the neighborhood's actual timezone (spec section 15). Returns null when there's
 * no opening-hours data at all — callers should simply not render a status in that case rather
 * than guessing.
 */
export function getBusinessOpenStatus(openingHours: BusinessOpeningHours[] | undefined, now: Date): BusinessOpenStatus | null {
  if (!openingHours || openingHours.length === 0) return null;

  const { weekday: todayWeekday, time: currentTime } = getZonedNow(now);
  const today = findDay(openingHours, todayWeekday);

  if (today && !today.closed) {
    const openInterval = today.intervals.find((interval) => currentTime >= interval.opensAt && currentTime < interval.closesAt);
    if (openInterval) {
      return { isOpenNow: true, label: "פתוח עכשיו" };
    }

    const upcomingToday = today.intervals
      .filter((interval) => interval.opensAt > currentTime)
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt))[0];
    if (upcomingToday) {
      return { isOpenNow: false, label: `נפתח היום ב־${upcomingToday.opensAt}` };
    }
  }

  const todayIndex = WEEKDAY_ORDER.indexOf(todayWeekday);
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = WEEKDAY_ORDER[(todayIndex + offset) % 7];
    const entry = findDay(openingHours, day);
    if (!entry || entry.closed || entry.intervals.length === 0) continue;
    const earliest = [...entry.intervals].sort((a, b) => a.opensAt.localeCompare(b.opensAt))[0];
    const dayLabel = offset === 1 ? "מחר" : WEEKDAY_LABEL[day];
    return { isOpenNow: false, label: `נפתח ${offset === 1 ? dayLabel : `ב${dayLabel}`} ב־${earliest.opensAt}` };
  }

  return { isOpenNow: false, label: "סגור עכשיו" };
}
