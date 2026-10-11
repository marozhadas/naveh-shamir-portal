import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("@/editor/connected/ConnectedHeader", () => ({ ConnectedHeader: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));

import NotFound, { metadata } from "./not-found";

describe("root not-found page", () => {
  const html = renderToStaticMarkup(createElement(NotFound));

  it("is in Hebrew", () => {
    expect(html).toContain("הדף לא נמצא");
    expect(html).toContain("שגיאה 404");
    expect(html).not.toContain("This page could not be found");
  });

  it("has a clear link back to the home page", () => {
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>(<[^>]+>)*חזרה לדף הבית/);
  });

  it("is not indexed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
