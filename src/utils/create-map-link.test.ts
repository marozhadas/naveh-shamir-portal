import { describe, expect, it } from "vitest";
import { createMapLink } from "./create-map-link";

describe("createMapLink", () => {
  it("prefers coordinates when available", () => {
    const link = createMapLink({ neighborhood: "נווה שמיר", address: "רחוב הדקל 4", latitude: 32.05, longitude: 34.78 });
    expect(link).toBe("https://www.google.com/maps/search/?api=1&query=32.05,34.78");
  });

  it("falls back to the encoded address when there are no coordinates", () => {
    const link = createMapLink({ neighborhood: "נווה שמיר", address: "רחוב הדקל 4" });
    expect(link).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("רחוב הדקל 4")}`);
  });

  it("returns null when there's no address or coordinates", () => {
    expect(createMapLink({ neighborhood: "נווה שמיר" })).toBeNull();
  });

  it("returns null when location is undefined", () => {
    expect(createMapLink(undefined)).toBeNull();
  });
});
