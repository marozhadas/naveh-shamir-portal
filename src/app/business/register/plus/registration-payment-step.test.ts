import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as copy from "@/lib/sumit/registration-copy";

const read = (file: string) => readFileSync(path.resolve(__dirname, file), "utf8");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const wizard = read("./PlusRegistrationWizard.tsx");
const form = readFileSync(path.resolve(__dirname, "../../../../components/business-dashboard/SumitCardForm/SumitCardForm.tsx"), "utf8");
const loader = readFileSync(path.resolve(__dirname, "../../../../components/business-dashboard/SumitCardForm/load-payments-js.ts"), "utf8");

describe("registration wizard - step 6 (SUMIT card step: SAVE a card only)", () => {
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
    expect(wizard).toMatch(/const storedId = sessionStorage\.getItem\(submittedKey\);\s*if \(paymentEnabled && storedId\) \{\s*registrationIdRef\.current = storedId;[\s\S]*?setSubmittedId\(storedId\);\s*setStep\(6\);\s*return;/);
    expect(wizard).toMatch(/setStep\(Math\.min\(parsed\.step \?\? 1, 5\)\)/);
    expect(wizard).toMatch(/if \(step > 5\) return;/);
    expect(wizard).toMatch(/\{step < 6 && \(/);
  });

  it("step 6 renders the SUMIT card form for the saved registration and ends on the success page that says it waits for approval", () => {
    expect(wizard).toMatch(/\{step === 6 && payment && submittedId && \(/);
    expect(wizard).toContain("<SumitCardForm");
    expect(wizard).toContain("companyId={payment.companyId}");
    expect(wizard).toContain("apiPublicKey={payment.apiPublicKey}");
    expect(wizard).toContain("registrationId={submittedId}");
    expect(wizard).toContain("/business/register/success?plan=${planId}&payment=saved");
    expect(wizard).not.toContain("live=1");
    // the PayMe form is not part of the wizard any more
    expect(strip(wizard)).not.toMatch(/PaymentMethodTrialForm|hostedFieldsKey/);
  });

  it("the step takes nothing from the browser except what the form sends: the wizard passes no price, key or secret", () => {
    const usage = wizard.slice(wizard.indexOf("<SumitCardForm"), wizard.indexOf("/>", wizard.indexOf("<SumitCardForm")));
    expect(usage).not.toMatch(/amount|price|apiKey\b|secret/i);
  });
});

describe("the words: a card is only SAVED - no automatic trial, no charge date is promised", () => {
  it("the wizard, the review step and the consent use the save-only copy", () => {
    expect(wizard).toContain("REVIEW_PAYMENT_NOTE");
    expect(wizard).toContain("REVIEW_PAYMENT_CONSENT");
    expect(wizard).toContain("STEP6_INTRO");
    // the old promise (trial starts after the approval, then billing) must be gone from the code that shows while step 6 is on
    expect(wizard).not.toContain("לאחר אישור העסק על ידי הצוות תתחיל תקופת ניסיון");
    expect(wizard).not.toContain("ולאחריה יתבצע חיוב לפי המסלול שנבחר");
    expect(wizard).not.toContain("אמצעי תשלום והפעלה");
  });

  it("every text that shows while the card step is on says: no charge, no subscription, no trial - and never that a trial starts by itself", () => {
    const shown = [copy.SAVE_ONLY_SUMMARY, copy.REGISTRATION_PAGE_DISCLAIMER, copy.REVIEW_PAYMENT_NOTE, copy.STEP6_INTRO, copy.CARD_FORM_LEAD, copy.SUCCESS_PAYMENT_SAVED, copy.RESUME_NOTICE];
    for (const text of shown) {
      expect(text).toMatch(/לא (מתבצע|יתבצע|בוצע) חיוב|לא בוצע חיוב/);
      expect(text).toMatch(/לא (נוצר|ייווצר) מנוי/);
      expect(text).toMatch(/לא (מתחילה|תתחיל|התחילה) תקופת ניסיון/);
      expect(text).not.toMatch(/באופן אוטומטי|תתחיל תקופת ניסיון \(|ולאחריה יתבצע|30 ימים|90 ימים|מחיר השקה/);
    }
    expect(copy.REVIEW_PAYMENT_CONSENT).not.toMatch(/להפעיל את תקופת הניסיון|אוטומטי|30 ימים|90 ימים/);
    expect(copy.CARD_FORM_CONSENT).not.toMatch(/להפעיל|אוטומטי|30 ימים|90 ימים/);
  });

  it("the card form and the success page use that copy, not their own promises", () => {
    expect(form).toContain("CARD_FORM_LEAD");
    expect(form).toContain("CARD_FORM_CONSENT");
    expect(strip(form)).not.toMatch(/תקופת ניסיון|אוטומטי|30 ימים|90 ימים|מחיר השקה/);
    const success = read("../success/page.tsx");
    expect(success).toContain("SUCCESS_PAYMENT_SAVED");
    expect(success).not.toContain("באופן אוטומטי (30 ימים");
  });

  it("step 5 (review) promises no trial while step 6 follows: legend, consent, error text and error-summary label", () => {
    const code = strip(wizard);
    expect(code).toContain("REVIEW_BILLING_LEGEND");
    expect(code).toContain("paymentEnabled ? REVIEW_PAYMENT_CONSENT_ERROR : errors.trialConsent");
    expect(code).toContain('key === "trialConsent" && paymentEnabled) return REVIEW_PAYMENT_CONSENT_LABEL');
    expect(code).toContain("labelForErrorKey(key, paymentEnabled)");
    // the "30 days" wording survives ONLY on the branch without the card step
    expect(code).toContain(": `בחרו מסלול חיוב (${TRIAL_DAYS} ימי ניסיון חינם בשני המסלולים)`");
    expect(code).toContain(': "אני מאשר/ת להפעיל את 30 ימי הניסיון לאחר אישור העסק."');
    expect(code).toContain("paymentEnabled ? REVIEW_BILLING_LEGEND :");
    for (const text of [copy.REVIEW_BILLING_LEGEND, copy.REVIEW_PAYMENT_CONSENT_ERROR, copy.REVIEW_PAYMENT_CONSENT_LABEL, copy.REVIEW_PAYMENT_CONSENT, copy.REVIEW_PAYMENT_NOTE]) {
      expect(text).not.toMatch(/30|90|ימי ניסיון חינם|להפעיל את תקופת הניסיון|אוטומטי/);
    }
  });

  it("the card form describes where the card goes truthfully: not an iframe, not 'the portal never sees it' by accident", () => {
    expect(copy.CARD_FORM_SECURITY_NOTE).toContain("SUMIT");
    expect(copy.CARD_FORM_SECURITY_NOTE).toContain("אסימון חד-פעמי");
    expect(copy.CARD_FORM_SECURITY_NOTE).not.toMatch(/PayMe|iframe|מוזנים בטופס המאובטח של/);
  });
});

describe("Plus / Premium pages hand the browser only the CompanyID and the PUBLIC key", () => {
  for (const plan of ["plus", "premium"]) {
    it(`${plan}: the card step comes from getSumitRegistrationPayment (SUMIT_TEST_EMAILS, test organization) and nothing else`, () => {
      const source = read(plan === "plus" ? "./page.tsx" : "../premium/page.tsx");
      expect(source).toContain("getSumitRegistrationPayment(sessionUser.email)");
      expect(source).toContain("payment={payment}");
      expect(source).toContain("REGISTRATION_PAGE_DISCLAIMER");
      expect(strip(source)).not.toMatch(/apiKey|SUMIT_API_KEY|process\.env|payme(?!nt)|hostedFieldsKey/i);
      expect(source).not.toContain("עולה לאוויר");
      expect(source).not.toContain("הניסיון מתחיל רק לאחר אישור העסק.\"");
    });
  }
});

describe("the SUMIT card form only SAVES the card", () => {
  const code = strip(form);

  it("calls only the SUMIT save action, and sends it ONLY the registration id, the one-time token, the payer and the consent", () => {
    expect(code).toMatch(/await saveSumitPaymentMethodForRegistrationAction\(\{\s*registrationId,\s*token: attempt\.token,\s*payer: \{ firstName: payer\.firstName, lastName: payer\.lastName, email: payer\.email, phone: payer\.phone \},\s*consent,\s*\}\)/);
    expect(code).not.toMatch(/generate-subscription|activateTrial|startRealBusinessTrial|savePaymentMethodForRegistrationAction/);
  });

  it("card data never leaves the inputs: uncontrolled inputs read through refs, no state/props/storage/logs, no card field in the action call", () => {
    expect(code).not.toMatch(/localStorage|sessionStorage|console\./);
    expect(code).not.toMatch(/useState\([^)]*(card|token|cvv|number)/i);
    const call = code.slice(code.indexOf("await saveSumitPaymentMethodForRegistrationAction"), code.indexOf("if (outcome.status"));
    expect(call).not.toMatch(/card|cvv|number|expir|month|year|citizen/i);
    for (const marker of ['data-og="cardnumber"', 'data-og="expirationmonth"', 'data-og="expirationyear"', 'data-og="cvv"']) expect(form).toContain(marker);
    // no ID-number field is collected
    expect(form).not.toContain('data-og="citizenid"');
    // the card is wiped from the page as soon as a token exists
    expect(code.indexOf("clearCard();")).toBeGreaterThan(code.indexOf("requestToken("));
    expect(code.indexOf("clearCard();")).toBeLessThan(code.indexOf("await saveSumitPaymentMethodForRegistrationAction"));
  });

  it("double submission is prevented: a lock before anything starts, one tokenization per click, no native submit, no BindFormSubmit", () => {
    expect(code).toMatch(/if \(busyRef\.current\) return;/);
    expect(code.indexOf("busyRef.current = true")).toBeLessThan(code.indexOf("requestToken("));
    expect(code).toMatch(/busyRef\.current = false;/);
    expect(code.match(/requestToken\(/g)?.length).toBe(1);
    expect(code).toMatch(/event\.preventDefault\(\);/);
    expect(code).not.toContain("BindFormSubmit");
    expect(code).toMatch(/disabled=\{!ready \|\| busy\}/);
  });

  it("shows only its own Hebrew messages (SUMIT's text is never displayed) and has a way out when payments.js stays silent", () => {
    expect(code).not.toMatch(/UserErrorMessage|TechnicalErrorDetails/);
    expect(code).toMatch(/attempt\.status === "refused"/);
    expect(code).toMatch(/attempt\.status !== "ok"/);
    expect(strip(read("../../../../lib/sumit/payments-js.ts"))).toMatch(/TOKEN_TIMEOUT_MS/);
  });

  it("the form is honest about its provider and about being removed mid-attempt", () => {
    expect(code).toContain('<CardTrustBadges providerName="SUMIT" />');
    expect(code).not.toMatch(/PayMe/);
    // an attempt is cancellable, the unmount aborts it, and nothing runs after the form is gone
    expect(code).toContain("new AbortController()");
    expect(code).toContain("attemptRef.current?.abort()");
    expect(code).toContain('attempt.status === "cancelled" || !mountedRef.current) return;');
    expect(code.indexOf('attempt.status === "cancelled"')).toBeLessThan(code.indexOf("await saveSumitPaymentMethodForRegistrationAction"));
    expect(code).toContain("if (!mountedRef.current) return; // removed during the save");
  });

  it("the loader brings its own jQuery (payments.js needs it), sets only window.jQuery, and loads the SUMIT script once", () => {
    expect(form).toContain('import("jquery")');
    const loaderCode = strip(loader);
    expect(loaderCode).toMatch(/win\.jQuery = /);
    expect(loaderCode).not.toMatch(/win\.\$ ?=|window\.\$ ?=/);
    expect(loaderCode).toContain("PAYMENTS_JS_URL");
    expect(loaderCode).toMatch(/if \(!win\.jQuery\)/);
    expect(loaderCode).toMatch(/if \(!win\.OfficeGuy\)/);
    expect(readFileSync(path.resolve(__dirname, "../../../../../package.json"), "utf8")).toMatch(/"jquery": "3\.7\.1"/);
  });
});
