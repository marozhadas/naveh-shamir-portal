/**
 * Pure bucketing logic for the business owner's analytics trend chart — kept separate from the
 * DB-touching repository code so it stays testable without Supabase. Bucket width scales with the
 * window so every window renders a readable number of bars: 7 daily buckets for a week, ~15
 * two-day buckets for a month, ~13 weekly buckets for a quarter, 12 monthly buckets for a year.
 */

export type BusinessAnalyticsWindow = "7d" | "30d" | "90d" | "1y";

export const BUSINESS_ANALYTICS_WINDOWS: BusinessAnalyticsWindow[] = ["7d", "30d", "90d", "1y"];

export const BUSINESS_ANALYTICS_WINDOW_LABEL: Record<BusinessAnalyticsWindow, string> = {
  "7d": "7 ימים",
  "30d": "30 ימים",
  "90d": "90 ימים",
  "1y": "שנה",
};

export function isBusinessAnalyticsWindow(value: unknown): value is BusinessAnalyticsWindow {
  return typeof value === "string" && (BUSINESS_ANALYTICS_WINDOWS as string[]).includes(value);
}

const DAY_MS = 24 * 60 * 60 * 1000;

const WINDOW_CONFIG: Record<BusinessAnalyticsWindow, { days: number; bucketDays: number }> = {
  "7d": { days: 7, bucketDays: 1 },
  "30d": { days: 30, bucketDays: 2 },
  "90d": { days: 90, bucketDays: 7 },
  "1y": { days: 365, bucketDays: 30 },
};

export function getWindowStart(window: BusinessAnalyticsWindow, now: Date): Date {
  return new Date(now.getTime() - WINDOW_CONFIG[window].days * DAY_MS);
}

export type TrendBucket = { label: string; startMs: number; endMs: number };

function formatBucketLabel(date: Date, bucketDays: number): string {
  if (bucketDays >= 28) return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", month: "short" }).format(date);
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric" }).format(date);
}

/** Oldest bucket first — each bucket is a half-open interval [startMs, endMs), ending exactly at `now` for the last one. */
export function buildTrendBuckets(window: BusinessAnalyticsWindow, now: Date): TrendBucket[] {
  const { days, bucketDays } = WINDOW_CONFIG[window];
  const bucketMs = bucketDays * DAY_MS;
  const count = Math.ceil(days / bucketDays);
  const nowMs = now.getTime();

  const buckets: TrendBucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const endMs = nowMs - i * bucketMs;
    const startMs = endMs - bucketMs;
    buckets.push({ startMs, endMs, label: formatBucketLabel(new Date(endMs), bucketDays) });
  }
  return buckets;
}

/** Counts how many of `timestamps` (ISO strings) fall into each bucket — a timestamp exactly on a boundary belongs to the later bucket. */
export function countTimestampsInBuckets(timestamps: string[], buckets: TrendBucket[]): number[] {
  const counts = new Array(buckets.length).fill(0);
  for (const ts of timestamps) {
    const t = new Date(ts).getTime();
    for (let i = 0; i < buckets.length; i += 1) {
      if (t >= buckets[i].startMs && t < buckets[i].endMs) {
        counts[i] += 1;
        break;
      }
    }
  }
  return counts;
}
