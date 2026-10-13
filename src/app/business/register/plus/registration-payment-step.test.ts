import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (file: string) => readFileSync(path.resolve(__dirname, file), "utf8");
const wizard = read("./PlusRegistrationWizard.tsx");
const form = readFileSync(path.resolve(__dirname, "../../../../components/business-dashboard/PaymentMethodTrialForm/PaymentMethodTrialForm.tsx"), "utf8");

describe("registration wizard - step 6 (payment: tokenization only)", () => {
  it("the stepper has a sixth step only when the server enabled payment", () => {
    expect(wizard).toMatch(/const stepLabels = paymentEnabled \? \[\.\.\.STEP_LABELS, PAYMENT_STEP_LABEL\] : STEP_LABELS;/);
    expect(wizard).toMatch(/\{stepLabels\.map\(/);
    expect(wizard.match(/const STEP_LABELS = \[[^\]]*\]/)?.[0].split(",").length).toBe(5);
  });

  it("without payment the registration still ends at step 5 and goes to the success page", () => {
    expect(wizard).toMatch(/router\.push\(`\/business\/register\/success\?plan=\$\{planId\}`\)/);
    expect(wizard).toMatch(/paymentEnabled \? "המשך לתשלום" : "שליחת העסק לבדיקה"/);
  });

  it("with payment, a saved business moves to step 6 instead of the success page", () => {
    expect(wizard).toMatch(/if \(paymentEnabled\) \{[\s\S]*?setStep\(6\);/);
  });

  it("a refresh at step 6 comes back to the payment step for the SAME registration - it never starts a second registration", () => {
    expect(wizard).toContain("SUBMITTED_KEY_BY_PLAN");
    // the saved registration id is restored (and the form is not shown again), before any draft is restored
    expect(wizard).toMatch(/const storedId = sessionStorage\.getItem\(submittedKey\);\s*if \(paymentEnabled && storedId\) \{\s*registrationIdRef\.current = storedId;[\s\S]*?setSubmittedId\(storedId\);\s*setStep\(6\);\s*return;/);
    expect(wizard).toMatch(/setStep\(Math\.min\(parsed\.step \?\? 1, 5\)\)/);
    // step 6 is never persisted as a draft step and submitting is not offered there
    expect(wizard).toMatch(/if \(step > 5\) return;/);
    expect(wizard).toMatch(/\{step < 6 && \(/);
  });

  it("step 6 renders the Hosted Fields form for the saved registration and ends on the success page that says it waits for approval", () => {
    expect(wizard).toMatch(/\{step === 6 && payment && submittedId && \(/);
    expect(wizard).toContain("registrationId={submittedId}");
    expect(wizard).toContain("/business/register/success?plan=${planId}&payment=saved");
    expect(wizard).not.toContain("live=1");
  });

  it("the card step takes its price from the shared pricing, never from user input", () => {
    expect(wizard).toMatch(/amountValue=\{getCurrentPrice\(planId, values\.billingInterval\)\.amountIls\.toFixed\(2\)\}/);
  });

  it("the copy: no charge now, the trial starts after the approval (30 days, or 90 for a pilot), then billing per the chosen track", () => {
    expect(wizard).toMatch(/paymentEnabled\s*\?[\s\S]*?לא מתבצע חיוב עכשיו[\s\S]*?לאחר אישור העסק על ידי הצוות תתחיל תקופת ניסיון \(30 ימים, או 90 ימים בהטבת פיילוט\)[\s\S]*?יתבצע חיוב לפי המסלול שנבחר/);
    expect(wizard).not.toContain("עולה לאוויר");
    expect(form).toContain("לא מתבצע חיוב עכשיו.");
    expect(form).toMatch(/לאחר שהצוות יאשר את העסק תתחיל תקופת ניסיון \(30 ימים, או 90 ימים בהטבת פיילוט\), ולאחריה יתבצע חיוב לפי המסלול שנבחר/);
    expect(form).toMatch(/אני מאשר\/ת: לא מתבצע חיוב עכשיו; לאחר אישור העסק תתחיל תקופת ניסיון \(30 ימים, או 90 ימים בהטבת פיילוט\); ולאחר תקופת הניסיון יתבצע חיוב לפי המסלול שנבחר/);
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
      expect(source).not.toContain("עולה לאוויר");
    });
  }
});

describe("the payment form in registration mode only SAVES the card", () => {
  it("calls the save action (not the trial action) and never the subscription path", () => {
    expect(form).toMatch(/registrationId\s*\?\s*await savePaymentMethodForRegistrationAction\(\{ registrationId, token: tokenized\.token, cardMask: tokenized\.cardMask, consent \}\)\s*:\s*await activateTrialWithPaymentMethodAction\(/);
    expect(form).not.toMatch(/generate-subscription|generatePayMeSubscription/);
  });

  it("the token goes only to the server action: it is not put in state, storage, the URL or a log", () => {
    expect(form).not.toMatch(/localStorage|sessionStorage|console\./);
    expect(form).not.toMatch(/useState\([^)]*token/i);
  });
});

describe("success page", () => {
  const success = read("../success/page.tsx");

  it("says the registration was received and waits for approval - never that the page is online", () => {
    expect(success).toContain('payment === "saved" && (plan === "plus" || plan === "premium")');
    expect(success).toContain("העסק ממתין לאישור הצוות");
    expect(success).toContain("לא בוצע חיוב");
    expect(success).toContain("לא תצטרכו לבצע שום פעולה נוספת");
    expect(success).not.toContain("העמוד שלכם באוויר");
    expect(success).not.toMatch(/live/);
  });
});
