import { describe, expect, it } from "vitest";
import { normalizePhoneForWhatsAppLink } from "./normalize-phone-for-whatsapp-link";

describe("normalizePhoneForWhatsAppLink", () => {
  it("converts a local Israeli number to the international wa.me form", () => {
    expect(normalizePhoneForWhatsAppLink("054-521-8644")).toBe("972545218644");
  });

  it("turns the portal's own main number 0545218644 into 972545218644", () => {
    expect(normalizePhoneForWhatsAppLink("0545218644")).toBe("972545218644");
  });

  it("normalizes every Israeli mobile prefix (05X...) the same way", () => {
    for (const prefix of ["050", "051", "052", "053", "054", "055", "056", "058"]) {
      expect(normalizePhoneForWhatsAppLink(`${prefix}1234567`)).toBe(`972${prefix.slice(1)}1234567`);
    }
  });

  it("strips spaces and parentheses", () => {
    expect(normalizePhoneForWhatsAppLink("(054) 521 8644")).toBe("972545218644");
  });

  it("leaves an already-international number's digits as-is", () => {
    expect(normalizePhoneForWhatsAppLink("+972545218644")).toBe("972545218644");
  });

  it("leaves a bare-972 number (no leading 0) as-is", () => {
    expect(normalizePhoneForWhatsAppLink("972545218644")).toBe("972545218644");
  });

  it("returns an empty string when there are no digits", () => {
    expect(normalizePhoneForWhatsAppLink("")).toBe("");
    expect(normalizePhoneForWhatsAppLink("abc")).toBe("");
  });
});
