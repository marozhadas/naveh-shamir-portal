import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));
// the client control needs the router: a marker stands in for it, so the test sees whether the section DRAWS it
vi.mock("./BusinessBillingTestControl", () => ({
  BusinessBillingTestControl: (props: Record<string, unknown>) => createElement("div", { "data-payme-control": "yes", "data-props": JSON.stringify(props) }),
}));

const ENV = ["PAYMENTS_PROVIDER", "PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"] as const;
beforeEach(() => {
  // a COMPLETE PayMe configuration: hiding the switch must not depend on PayMe being unconfigured
  process.env.PAYME_ENV = "sandbox";
  process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER-789";
  process.env.PAYME_HOSTED_FIELDS_KEY = "public-key-for-browser-456";
  process.env.PAYME_WEBHOOK_SECRET = "w".repeat(40);
});
afterEach(() => {
  for (const key of ENV) delete process.env[key];
  vi.doUnmock("@/lib/payme/dormant");
  vi.resetModules();
});

async function render(): Promise<string> {
  const { BillingTestSection } = await import("./BillingTestSection");
  return renderToStaticMarkup(createElement(BillingTestSection, { businessId: "11111111-1111-1111-1111-111111111111", enabled: false, hasPayMeSubscription: false }));
}

describe("the admin's billing-test block with PAYMENTS_PROVIDER=sumit", () => {
  it("does not draw the PayMe sandbox switch, its button or its dialog - only a plain notice that the SUMIT test track is managed separately", async () => {
    process.env.PAYMENTS_PROVIDER = "sumit";
    const html = await render();
    expect(html).toContain("מסלול בדיקות SUMIT מנוהל בנפרד");
    expect(html).not.toContain("data-payme-control");
    expect(html).not.toContain("Sandbox");
    expect(html).not.toContain("הפעלת בדיקת סליקה");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<dialog");
  });

  it("also hidden when PAYMENTS_PROVIDER is unset or invalid (PayMe is dormant whatever is configured)", async () => {
    for (const value of [undefined, "", "payme", "stripe"]) {
      vi.resetModules();
      if (value === undefined) delete process.env.PAYMENTS_PROVIDER;
      else process.env.PAYMENTS_PROVIDER = value;
      expect(await render(), String(value)).not.toContain("data-payme-control");
    }
  });

  it("the PayMe control is still in the code and still drawn by the section when PayMe is (hypothetically) active - rollback / cleanup stay possible", async () => {
    vi.doMock("@/lib/payme/dormant", () => ({ isPayMeProviderActive: () => true }));
    vi.resetModules();
    const html = await render();
    expect(html).toContain('data-payme-control="yes"');
    expect(html).not.toContain("מסלול בדיקות SUMIT מנוהל בנפרד");
  });
});

describe("the business admin page", () => {
  const dir = __dirname;
  const page = readFileSync(path.join(dir, "page.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("renders the section, never the PayMe control directly, and no longer reads the PayMe configuration itself", () => {
    expect(page).toContain("<BillingTestSection");
    expect(page).not.toContain("<BusinessBillingTestControl");
    expect(page).not.toMatch(/getPayMeConfig|@\/lib\/payme\//);
  });

  it("the PayMe control file is NOT deleted (no PayMe infrastructure removed)", () => {
    expect(readFileSync(path.join(dir, "BusinessBillingTestControl.tsx"), "utf8")).toContain("changeBusinessBillingTestAction");
  });
});
