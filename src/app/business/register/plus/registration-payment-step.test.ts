import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file: string) => readFileSync(path.resolve(__dirname, file), "utf8");
const wizard = read("./PlusRegistrationWizard.tsx");

describe("registration wizard - step 6 (payment)", () => {
  it("the stepper has a sixth step only when the server enabled payment", () => {
    expect(wizard).toMatch(/const stepLabels = paymentEnabled \? \[\.\.\.STEP_LABELS, PAYMENT_STEP_LABEL\] : STEP_LABELS;/);
    expect(wizard).toMatch(/\{stepLabels\.map\(/);
    expect(wizard).toContain("const STEP_LABELS = [");
    expect(wizard.match(/const STEP_LABELS = \[[^\]]*\]/)?.[0].split(",").length).toBe(5);
  });

  it("without payment the registration still ends at step 5 and goes to the success page", () => {
    expect(wizard).toMatch(/router\.push\(`\/business\/register\/success\?plan=\$\{planId\}`\)/);
    expect(wizard).toMatch(/paymentEnabled \? "המשך לתשלום" : "שליחת העסק לבדיקה"/);
  });

  it("with payment, a saved business moves to step 6 instead of the success page, and a reload returns to it", () => {
    expect(wizard).toMatch(/if \(paymentEnabled\) \{[\s\S]*?setStep\(6\);/);
    expect(wizard).toContain("SUBMITTED_KEY_BY_PLAN");
    expect(wizard).toMatch(/setStep\(Math\.min\(parsed\.step \?\? 1, 5\)\)/);
  });

  it("step 6 renders the Hosted Fields form for the saved registration and finishes on the live success page", () => {
    expect(wizard).toMatch(/\{step === 6 && payment && submittedId && \(/);
    expect(wizard).toContain("registrationId={submittedId}");
    expect(wizard).toContain("/business/register/success?plan=${planId}&live=1");
  });

  it("the card step takes its price label and amount from the shared pricing, never from user input", () => {
    expect(wizard).toMatch(/amountValue=\{getCurrentPrice\(planId, values\.billingInterval\)\.amountIls\.toFixed\(2\)\}/);
  });

  it("the review-step copy only promises 'online right away' when the payment step exists", () => {
    expect(wizard).toMatch(/paymentEnabled\s*\?[\s\S]*?העמוד שלכם עולה לאוויר מיד[\s\S]*?:[\s\S]*?הניסיון מתחיל רק לאחר אישור העסק/);
  });
});

describe("Plus / Premium pages hand the browser only the public key", () => {
  for (const plan of ["plus", "premium"]) {
    it(`${plan}: the payment option comes from getPayMeConfigForRegistrant (sandbox: test emails only) and exposes just hostedFieldsKey`, () => {
      const source = read(plan === "plus" ? "./page.tsx" : "../premium/page.tsx");
      expect(source).toContain("getPayMeConfigForRegistrant(sessionUser.email)");
      expect(source).toMatch(/hostedFieldsKey: payMeConfig\.hostedFieldsKey, testMode: payMeConfig\.env === "sandbox"/);
      expect(source).not.toMatch(/sellerId|webhookSecret/);
      expect(source).toContain("payment={payment}");
    });
  }

  it("the form calls the registration action when it is step 6, and the old trial action otherwise", () => {
    const form = readFileSync(path.resolve(__dirname, "../../../../components/business-dashboard/PaymentMethodTrialForm/PaymentMethodTrialForm.tsx"), "utf8");
    expect(form).toMatch(/registrationId\s*\?\s*await completeRegistrationWithPaymentAction\(\{ registrationId, token: result\.token, cardMask: [^,]+, consent \}\)\s*:\s*await activateTrialWithPaymentMethodAction\(/);
  });
});

describe("success page", () => {
  it("only claims the page is live for a plus/premium registration that came back with live=1", () => {
    const success = read("../success/page.tsx");
    expect(success).toContain('live === "1" && (plan === "plus" || plan === "premium")');
    expect(success).toContain("העמוד שלכם באוויר");
  });
});
