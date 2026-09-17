import { describe, expect, it } from "vitest";
import { buildTrendBuckets, countTimestampsInBuckets, isBusinessAnalyticsWindow, getWindowStart } from "./business-analytics-window";

const NOW = new Date("2026-09-17T12:00:00.000Z");

describe("isBusinessAnalyticsWindow", () => {
  it.each(["7d", "30d", "90d", "1y"])("accepts %s", (value) => {
    expect(isBusinessAnalyticsWindow(value)).toBe(true);
  });

  it.each(["7", "week", "", null, undefined, 30])("rejects %s", (value) => {
    expect(isBusinessAnalyticsWindow(value)).toBe(false);
  });
});

describe("getWindowStart", () => {
  it("goes back exactly the window's day count", () => {
    expect(getWindowStart("7d", NOW).getTime()).toBe(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(getWindowStart("1y", NOW).getTime()).toBe(NOW.getTime() - 365 * 24 * 60 * 60 * 1000);
  });
});

describe("buildTrendBuckets", () => {
  it("produces 7 daily buckets for the 7-day window", () => {
    const buckets = buildTrendBuckets("7d", NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[buckets.length - 1].endMs).toBe(NOW.getTime());
  });

  it("produces monthly buckets for the 1-year window, ending exactly at now", () => {
    const buckets = buildTrendBuckets("1y", NOW);
    expect(buckets.length).toBeGreaterThanOrEqual(12);
    expect(buckets[buckets.length - 1].endMs).toBe(NOW.getTime());
    expect(buckets[0].startMs).toBeLessThan(buckets[0].endMs);
  });

  it("buckets are contiguous and ordered oldest-first", () => {
    const buckets = buildTrendBuckets("30d", NOW);
    for (let i = 1; i < buckets.length; i += 1) {
      expect(buckets[i].startMs).toBe(buckets[i - 1].endMs);
    }
  });
});

describe("countTimestampsInBuckets", () => {
  it("counts each timestamp into exactly one bucket", () => {
    const buckets = buildTrendBuckets("7d", NOW);
    const timestamps = [
      new Date(buckets[0].startMs + 1000).toISOString(), // just inside the first bucket
      new Date(buckets[6].endMs - 1000).toISOString(), // just inside the last bucket
    ];
    const counts = countTimestampsInBuckets(timestamps, buckets);
    expect(counts[0]).toBe(1);
    expect(counts[6]).toBe(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("a timestamp exactly on a boundary belongs to the later bucket", () => {
    const buckets = buildTrendBuckets("7d", NOW);
    const boundary = new Date(buckets[3].startMs).toISOString();
    const counts = countTimestampsInBuckets([boundary], buckets);
    expect(counts[3]).toBe(1);
    expect(counts[2]).toBe(0);
  });

  it("a timestamp outside every bucket is not counted at all", () => {
    const buckets = buildTrendBuckets("7d", NOW);
    const tooOld = new Date(buckets[0].startMs - 24 * 60 * 60 * 1000).toISOString();
    const counts = countTimestampsInBuckets([tooOld], buckets);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(0);
  });
});
