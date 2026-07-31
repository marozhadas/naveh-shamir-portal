import { describe, expect, it } from "vitest";
import { isSafeHref, isSafeHrefOrEmpty } from "./validate-href";

describe("isSafeHref (site copy)", () => {
  it("rejects javascript:, data: and vbscript: URLs", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHref("vbscript:msgbox(1)")).toBe(false);
  });

  it("accepts internal paths, anchors, https, tel and mailto links", () => {
    expect(isSafeHref("/businesses")).toBe(true);
    expect(isSafeHref("#top")).toBe(true);
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(isSafeHref("tel:+972500000000")).toBe(true);
    expect(isSafeHref("mailto:hello@example.com")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isSafeHref("")).toBe(false);
  });
});

describe("isSafeHrefOrEmpty (site copy)", () => {
  it("accepts an empty string but still rejects a dangerous scheme", () => {
    expect(isSafeHrefOrEmpty("")).toBe(true);
    expect(isSafeHrefOrEmpty("javascript:alert(1)")).toBe(false);
  });
});
