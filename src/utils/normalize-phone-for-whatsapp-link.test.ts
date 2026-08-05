import { describe, expect, it } from "vitest";
import { normalizePhoneForWhatsAppLink } from "./normalize-phone-for-whatsapp-link";

describe("normalizePhoneForWhatsAppLink", () => {
  it("converts a local Israeli number to the international wa.me form", () => {
    expect(normalizePhoneForWhatsAppLink("054-521-8644")).toBe("972545218644");
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
