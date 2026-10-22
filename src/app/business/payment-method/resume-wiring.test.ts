import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/business/dashboard/subscription-actions", () => ({ startCheckoutAction: vi.fn(), cancelSubscriptionAction: vi.fn(), reactivateSubscriptionAction: vi.fn() }));

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SubscriptionStatusCard } from "@/components/business-dashboard/SubscriptionStatusCard/SubscriptionStatusCard";

const read = (rel: string) => readFileSync(path.resolve(__dirname, rel), "utf8");

describe("the way back to step 6 is offered where the dead end used to be", () => {
  it("1. dashboard / subscription card: a paid pending registration without a card sees 'השלמת אמצעי תשלום' (not a trial button, not 'after approval', no automatic trial promised)", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionStatusCard, { subscription: null, access: null, isRealSubscription: true, businessSlug: "studio-noa", paymentResumeHref: "/business/payment-method" }));
    expect(html).toContain("נשאר שלב אחד להשלמת ההרשמה: שמירת אמצעי תשלום");
    expect(html).toContain("לא יתבצע חיוב, לא ייווצר מנוי ולא תתחיל תקופת ניסיון");
    expect(html).toContain("השלמת אמצעי תשלום");
    expect(html).toContain('href="/business/payment-method"');
    expect(html).not.toContain("הפעלת");
    expect(html).not.toContain("לאחר האישור תוכלו להפעיל");
    expect(html).not.toMatch(/באופן אוטומטי/);
  });

  it("7. without the resume link the card is exactly what it was (no CTA is invented)", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionStatusCard, { subscription: null, access: null, isRealSubscription: true, businessSlug: "studio-noa", blockedReason: "awaiting-approval" }));
    expect(html).toContain("העסק ממתין לאישור צוות הפורטל");
    expect(html).not.toContain("השלמת אמצעי תשלום");
  });

  it("the dashboard, the subscription page and /business/trial all ask the same server helper and point at the same route", () => {
    for (const file of ["../dashboard/(chrome)/page.tsx", "../dashboard/(chrome)/subscription/page.tsx", "../trial/page.tsx"]) {
      const source = read(file);
      expect(source, file).toContain("@/lib/business-owner/payment-resume");
      expect(source, file).toContain("getPaymentResume()");
      expect(source, file).toContain("PAYMENT_METHOD_ROUTE");
    }
  });

  it("/business/trial tells such an owner what is missing, with a button - not 'after approval you can start the trial'", () => {
    const source = read("../trial/page.tsx");
    const branch = source.slice(source.indexOf("const paymentResume"), source.indexOf("let eligibility"));
    expect(branch).toContain("{RESUME_NOTICE}");
    expect(branch).toContain("להשלמת אמצעי התשלום");
    expect(branch).not.toContain("לאחר האישור תוכלו להפעיל");
  });
});

describe("completing the card on the existing registration", () => {
  const step = read("./ResumePaymentStep.tsx");
  const form = readFileSync(path.resolve(__dirname, "../../../components/business-dashboard/SumitCardForm/SumitCardForm.tsx"), "utf8");

  it("3/4. uses the very same SUMIT card form and the same save-only action as step 6 (save a card: no charge, no subscription, no trial, no approval)", () => {
    expect(step).toContain("SumitCardForm");
    expect(step).toContain("registrationId={registrationId}");
    expect(form).toMatch(/await saveSumitPaymentMethodForRegistrationAction\(\{/);
    const code = step.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/generate|subscription|approve|activateTrial/i);
  });

  it("afterwards it shows that the registration is complete and waits for the admin's approval", () => {
    expect(step).toContain("/business/register/success?plan=${planTier}&payment=saved");
    const success = read("../register/success/page.tsx");
    expect(success).toContain("SUCCESS_PAYMENT_SAVED");
    expect(read("../../../lib/sumit/registration-copy.ts")).toContain("העסק ממתין לאישור הצוות");
  });

  it("the client wrapper never sees or stores the saved token", () => {
    expect(step).not.toMatch(/provider_token|buyer_key|buyerKey|token|sessionStorage|localStorage|console\./);
  });
});
