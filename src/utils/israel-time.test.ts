import { describe, expect, it } from "vitest";
import { israelUtcOffset, toIsraelIsoDateTime } from "./israel-time";

describe("Israel local time → ISO with the true offset", () => {
  it("summer (daylight saving) is +03:00", () => {
    expect(israelUtcOffset("2026-07-15", "12:00:00")).toBe("+03:00");
    expect(toIsraelIsoDateTime("2026-07-15", "12:00:00")).toBe("2026-07-15T12:00:00+03:00");
  });

  it("winter is +02:00", () => {
    expect(israelUtcOffset("2026-01-15", "12:00:00")).toBe("+02:00");
    expect(toIsraelIsoDateTime("2026-01-15", "09:30")).toBe("2026-01-15T09:30:00+02:00");
  });

  it("the daylight-saving boundaries fall on the right side (2026: starts Friday March 27, ends Sunday October 25)", () => {
    // before the spring change
    expect(israelUtcOffset("2026-03-26", "23:00:00")).toBe("+02:00");
    // after the spring change
    expect(israelUtcOffset("2026-03-27", "03:30:00")).toBe("+03:00");
    expect(israelUtcOffset("2026-03-28", "10:00:00")).toBe("+03:00");
    // day before the autumn change, still summer
    expect(israelUtcOffset("2026-10-24", "20:00:00")).toBe("+03:00");
    // after the autumn change, winter again
    expect(israelUtcOffset("2026-10-25", "12:00:00")).toBe("+02:00");
    expect(israelUtcOffset("2026-10-26", "08:00:00")).toBe("+02:00");
  });

  it("the local text is never altered, only the offset is added; seconds are filled in", () => {
    expect(toIsraelIsoDateTime("2026-10-12", "17:00:00")).toBe("2026-10-12T17:00:00+03:00");
    expect(toIsraelIsoDateTime("2026-12-12", "8:05")).toBe("2026-12-12T08:05:00+02:00");
  });

  it("the resulting instant is the real one (UTC check)", () => {
    expect(new Date(toIsraelIsoDateTime("2026-07-15", "12:00:00")!).toISOString()).toBe("2026-07-15T09:00:00.000Z");
    expect(new Date(toIsraelIsoDateTime("2026-01-15", "12:00:00")!).toISOString()).toBe("2026-01-15T10:00:00.000Z");
  });

  it("invalid input yields null instead of a made-up value", () => {
    expect(toIsraelIsoDateTime("not-a-date", "12:00:00")).toBeNull();
    expect(toIsraelIsoDateTime("2026-07-15", "noon")).toBeNull();
    expect(toIsraelIsoDateTime("2026-13-45", "12:00:00")).toBeNull();
  });
});
