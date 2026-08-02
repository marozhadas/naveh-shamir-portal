import { describe, expect, it } from "vitest";
import { formatBadgeCount, formatRelativeTime } from "./admin-notification-format";

describe("formatBadgeCount", () => {
  it("shows the exact count up to 99", () => {
    expect(formatBadgeCount(0)).toBe("0");
    expect(formatBadgeCount(7)).toBe("7");
    expect(formatBadgeCount(99)).toBe("99");
  });

  it("caps anything above 99 at '99+'", () => {
    expect(formatBadgeCount(100)).toBe("99+");
    expect(formatBadgeCount(1000)).toBe("99+");
  });
});

describe("formatRelativeTime", () => {
  it("reports 'עכשיו' for a timestamp within the last minute", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("עכשיו");
  });

  it("falls back to an absolute date far in the past", () => {
    const result = formatRelativeTime("2020-01-01T00:00:00.000Z");
    expect(result).not.toBe("עכשיו");
    expect(result.length).toBeGreaterThan(0);
  });
});
