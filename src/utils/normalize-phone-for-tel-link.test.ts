import { describe, expect, it } from "vitest";
import { normalizePhoneForTelLink } from "./normalize-phone-for-tel-link";

describe("normalizePhoneForTelLink", () => {
  it("returns a short municipal number unchanged", () => {
    expect(normalizePhoneForTelLink("106")).toBe("106");
  });

  it("strips spaces and dashes from a local number", () => {
    expect(normalizePhoneForTelLink("02-999 9999")).toBe("029999999");
  });

  it("preserves a leading + for an international number", () => {
    expect(normalizePhoneForTelLink("+972-2-999-9999")).toBe("+97229999999");
  });

  it("strips parentheses", () => {
    expect(normalizePhoneForTelLink("(02) 999-9999")).toBe("029999999");
  });

  it("never keeps a + that isn't at the start", () => {
    expect(normalizePhoneForTelLink("02+99")).toBe("0299");
  });
});
