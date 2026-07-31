import { describe, expect, it } from "vitest";
import { createWhatsappLink, DEFAULT_WHATSAPP_MESSAGE } from "./create-whatsapp-link";

describe("createWhatsappLink", () => {
  it("appends an encoded message to a wa.me URL", () => {
    const link = createWhatsappLink("https://wa.me/972500000001", "שלום!");
    expect(link).toBe(`https://wa.me/972500000001?text=${encodeURIComponent("שלום!")}`);
  });

  it("uses the default canned message when none is given", () => {
    const link = createWhatsappLink("https://wa.me/972500000001");
    expect(link).toContain(encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE));
  });

  it("uses & when the URL already has a query string", () => {
    const link = createWhatsappLink("https://wa.me/972500000001?ref=site", "שלום");
    expect(link).toBe(`https://wa.me/972500000001?ref=site&text=${encodeURIComponent("שלום")}`);
  });

  it("returns an empty string for a non-WhatsApp URL", () => {
    expect(createWhatsappLink("https://example.com")).toBe("");
  });

  it("returns an empty string for a javascript: URL", () => {
    expect(createWhatsappLink("javascript:alert(1)")).toBe("");
  });

  it("returns an empty string for an empty input", () => {
    expect(createWhatsappLink("")).toBe("");
  });
});
