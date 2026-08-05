import { describe, expect, it } from "vitest";
import { isValidWhatsAppGroupUrl } from "./validate-whatsapp-group-url";

describe("isValidWhatsAppGroupUrl", () => {
  it("accepts a chat.whatsapp.com invite link", () => {
    expect(isValidWhatsAppGroupUrl("https://chat.whatsapp.com/ABCDEFG12345")).toBe(true);
  });

  it("accepts a wa.me link", () => {
    expect(isValidWhatsAppGroupUrl("https://wa.me/972500000000")).toBe(true);
  });

  it("accepts an api.whatsapp.com link", () => {
    expect(isValidWhatsAppGroupUrl("https://api.whatsapp.com/send?phone=972500000000")).toBe(true);
  });

  it("rejects a non-WhatsApp domain", () => {
    expect(isValidWhatsAppGroupUrl("https://example.com/group")).toBe(false);
  });

  it("rejects an http (non-https) WhatsApp link", () => {
    expect(isValidWhatsAppGroupUrl("http://chat.whatsapp.com/ABCDEFG12345")).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    expect(isValidWhatsAppGroupUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(isValidWhatsAppGroupUrl("not a url")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidWhatsAppGroupUrl("")).toBe(false);
  });

  it("rejects a whatsapp-lookalike domain", () => {
    expect(isValidWhatsAppGroupUrl("https://chat.whatsapp.com.evil.example/x")).toBe(false);
  });
});
