import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getSumitRegistrationPayment, isSumitRegistrationEmailAllowed } from "./registration-access";

const KEYS = ["PAYMENTS_PROVIDER", "SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_ALLOW_PRODUCTION", "SUMIT_DRY_RUN", "SUMIT_TEST_EMAILS"] as const;
const EMAIL = "noa@example.com";

function configure(overrides: Partial<Record<(typeof KEYS)[number], string>> = {}) {
  process.env.PAYMENTS_PROVIDER = "sumit";
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456";
  process.env.SUMIT_TEST_EMAILS = EMAIL;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeEach(() => configure());
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("who may see the SUMIT card step in registration", () => {
  it("a listed email on the test organization gets the CompanyID and the PUBLIC key only", () => {
    const payment = getSumitRegistrationPayment(EMAIL);
    expect(payment).toEqual({ companyId: 123456, apiPublicKey: "public-key-for-tests", testMode: true });
    expect(JSON.stringify(payment)).not.toContain("secret-api-key-for-tests");
    expect(Object.keys(payment!).sort()).toEqual(["apiPublicKey", "companyId", "testMode"]);
  });

  it("the email match ignores case and surrounding spaces; anyone else, or no email, gets nothing", () => {
    expect(getSumitRegistrationPayment("  NOA@Example.com ")).not.toBeNull();
    for (const email of ["stranger@example.com", "", "   ", null, undefined]) expect(getSumitRegistrationPayment(email), String(email)).toBeNull();
  });

  it("limited to the list ALSO with SUMIT_DRY_RUN=false (the dry run is not the access rule)", () => {
    configure({ SUMIT_DRY_RUN: "false" });
    expect(getSumitRegistrationPayment("stranger@example.com")).toBeNull();
    expect(getSumitRegistrationPayment(EMAIL)).not.toBeNull();
  });

  it("an empty or missing SUMIT_TEST_EMAILS lets nobody in", () => {
    configure({ SUMIT_TEST_EMAILS: "" });
    expect(getSumitRegistrationPayment(EMAIL)).toBeNull();
    configure({ SUMIT_TEST_EMAILS: undefined });
    expect(getSumitRegistrationPayment(EMAIL)).toBeNull();
  });

  it("only the TEST organization: a production configuration never opens it, even for a listed email", () => {
    configure({ SUMIT_ENVIRONMENT: "production", SUMIT_ALLOW_PRODUCTION: "true", SUMIT_COMPANY_ID: "999999", SUMIT_DRY_RUN: "false" });
    expect(getSumitRegistrationPayment(EMAIL)).toBeNull();
    expect(isSumitRegistrationEmailAllowed({ environment: "production", testEmails: [EMAIL] }, EMAIL)).toBe(false);
    expect(isSumitRegistrationEmailAllowed({ environment: "test", testEmails: [EMAIL] }, EMAIL)).toBe(true);
  });

  it("a test configuration whose CompanyID is not the approved test organization is refused", () => {
    configure({ SUMIT_COMPANY_ID: "777777" });
    expect(getSumitRegistrationPayment(EMAIL)).toBeNull();
  });

  it("needs PAYMENTS_PROVIDER=sumit - unset, payme or anything else keeps it off", () => {
    for (const value of [undefined, "payme", "stripe", ""]) {
      configure({ PAYMENTS_PROVIDER: value });
      expect(getSumitRegistrationPayment(EMAIL), String(value)).toBeNull();
    }
  });

  it("incomplete SUMIT configuration keeps it off", () => {
    for (const key of ["SUMIT_API_PUBLIC_KEY", "SUMIT_API_KEY", "SUMIT_COMPANY_ID", "SUMIT_ENVIRONMENT"] as const) {
      configure({ [key]: undefined });
      expect(getSumitRegistrationPayment(EMAIL), key).toBeNull();
    }
  });
});
