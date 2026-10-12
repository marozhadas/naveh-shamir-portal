import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";

vi.mock("server-only", () => ({}));

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url), useRouter: () => ({ push: vi.fn() }) }));

const sessionUser = vi.fn();
vi.mock("@/lib/supabase/server-client", () => ({ getSupabaseSessionUser: () => sessionUser() }));
const resume = vi.fn();
vi.mock("@/lib/business-owner/payment-resume", () => ({ PAYMENT_METHOD_ROUTE: "/business/payment-method", getPaymentResume: () => resume() }));
const registrantConfig = vi.fn();
vi.mock("@/lib/payme/flow-access", () => ({ getPayMeConfigForRegistrant: (...args: unknown[]) => registrantConfig(...args) }));
vi.mock("@/editor/connected/ConnectedHeader", () => ({ ConnectedHeader: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
// The wrapper is replaced by a marker so the test sees exactly which props the server hands it.
vi.mock("./ResumePaymentStep", () => ({
  ResumePaymentStep: (props: Record<string, unknown>) => createElement("div", { "data-step6": "yes", "data-props": JSON.stringify(props) }),
}));

import PaymentMethodPage from "./page";

const RESUME = { registrationId: "55555555-5555-5555-5555-555555555555", planTier: "plus", billingInterval: "yearly", businessName: "סטודיו נועה", hostedFieldsKey: "public-key", testMode: false };

async function render(): Promise<string> {
  return renderToStaticMarkup(await PaymentMethodPage());
}

describe("/business/payment-method - step 6 for an existing pending registration", () => {
  beforeEach(() => {
    redirect.mockClear();
    sessionUser.mockReset();
    resume.mockReset();
    registrantConfig.mockReset();
    sessionUser.mockResolvedValue({ id: "user-1", email: "owner@example.com" });
    resume.mockResolvedValue(RESUME);
    registrantConfig.mockResolvedValue({ env: "live" });
  });

  it("2. leads to step 6 of THAT registration: the same payment form with the registration found on the server", async () => {
    const html = await render();
    expect(html).toContain('data-step6="yes"');
    const props = JSON.parse(/data-props="([^"]*)"/.exec(html)![1].replace(/&quot;/g, '"')) as Record<string, unknown>;
    expect(props.registrationId).toBe(RESUME.registrationId);
    expect(props.planTier).toBe("plus");
    // the price shown comes from the server-side price snapshot of the stored plan and track (yearly plus), not from the browser
    expect(props.priceLabel).toBe("390 ₪ לשנה");
    expect(props.amountValue).toBe("390.00");
    expect(html).toContain("נשאר שלב אחד להשלמת ההרשמה");
    expect(html).toContain("לא יתבצע חיוב כעת");
  });

  it("takes no id, price, trial or offer from the URL: the page has no parameters at all", () => {
    expect(PaymentMethodPage.length).toBe(0);
    const source = readFileSync(path.resolve(__dirname, "page.tsx"), "utf8");
    expect(source).not.toMatch(/searchParams|params/);
  });

  it("without a session it goes to the owner login and comes back here", async () => {
    sessionUser.mockResolvedValue(null);
    await expect(render()).rejects.toThrow("NEXT_REDIRECT:/business/owner/login?next=%2Fbusiness%2Fpayment-method");
    expect(resume).not.toHaveBeenCalled();
  });

  it("5/7/8/9. nothing to complete (already has a card, approved, free, someone else's): back to the dashboard - a refresh creates nothing", async () => {
    resume.mockResolvedValue(null);
    await expect(render()).rejects.toThrow("NEXT_REDIRECT:/business/dashboard");
  });

  it("10. sandbox, account not on the test list: told it is unavailable, no form at all", async () => {
    resume.mockResolvedValue(null);
    registrantConfig.mockResolvedValue(null);
    const html = await render();
    expect(html).toContain("אינה זמינה כרגע");
    expect(html).not.toContain('data-step6="yes"');
  });

  it("the page only reads: it imports no write path", () => {
    const source = readFileSync(path.resolve(__dirname, "page.tsx"), "utf8");
    expect(source).not.toMatch(/insert|upsert|update\(|delete\(|createAdminSupabaseClient|savePaymentMethod|generate/);
  });
});
