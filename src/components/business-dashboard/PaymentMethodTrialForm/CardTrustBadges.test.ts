import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CardTrustBadges } from "./CardTrustBadges";

describe("payment form: secure-payment badges and field height", () => {
  const html = renderToStaticMarkup(createElement(CardTrustBadges));

  it("shows only claims that are true of the page: HTTPS and PayMe's secure form", () => {
    expect(html).toContain("חיבור מאובטח (SSL)");
    expect(html).toContain("סליקה מאובטחת באמצעות PayMe");
    expect(html).not.toMatch(/PCI|256/);
  });

  it("shows accessible card-brand marks", () => {
    for (const brand of ["Visa", "Mastercard", "ישראכרט", "American Express"]) expect(html).toContain(`aria-label="${brand}"`);
  });

  it("the form renders the badges under the card fields", () => {
    const form = readFileSync(path.resolve(__dirname, "PaymentMethodTrialForm.tsx"), "utf8");
    expect(form).toMatch(/<CardTrustBadges \/>\s*<\/div>/);
  });

  it("PayMe's iframes are held to a one-line input height instead of their tall default", () => {
    const css = readFileSync(path.resolve(__dirname, "PaymentMethodTrialForm.module.css"), "utf8");
    expect(css).toMatch(/\.hosted \{[^}]*height: 44px;[^}]*overflow: hidden;/);
    expect(css).toMatch(/\.hosted iframe \{[^}]*height: 44px !important;/);
  });
});
