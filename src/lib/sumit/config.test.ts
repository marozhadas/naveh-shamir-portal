import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SUMIT_BASE_URL, getMissingSumitVariables, getSumitConfig, getSumitConfigurationProblems, isSumitAvailableForEmail, isSumitConfigured, parseSumitCompanyId, parseSumitDryRun, parseSumitEnvironment, parseSumitTestEmails } from "./config";

const KEYS = ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_ALLOW_PRODUCTION", "SUMIT_DRY_RUN", "SUMIT_TEST_EMAILS"] as const;

function configure(overrides: Partial<Record<(typeof KEYS)[number], string>> = {}) {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456"; // the approved test organization = the configured one
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
}

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("SUMIT configuration", () => {
  it("is off until every required variable exists and is valid", () => {
    expect(getSumitConfig()).toBeNull();
    expect(isSumitConfigured()).toBe(false);
    expect(getMissingSumitVariables()).toEqual(["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT"]);
    configure();
    expect(isSumitConfigured()).toBe(true);
    expect(getMissingSumitVariables()).toEqual([]);
  });

  it("the missing list names variables only, never values", () => {
    process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
    expect(JSON.stringify(getMissingSumitVariables())).not.toContain("secret-api-key-for-tests");
    expect(getMissingSumitVariables()).toEqual(["SUMIT_COMPANY_ID", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT"]);
  });

  it("the company id must be a positive integer", () => {
    expect(parseSumitCompanyId("123456")).toBe(123456);
    expect(parseSumitCompanyId(" 42 ")).toBe(42);
    for (const bad of [undefined, "", "0", "-5", "12.5", "abc", "1e3", "12345678901234567890"]) expect(parseSumitCompanyId(bad), String(bad)).toBeNull();
    configure({ SUMIT_COMPANY_ID: "abc" });
    expect(getSumitConfig()).toBeNull();
  });

  it("reads the credentials and uses the fixed API host", () => {
    configure();
    expect(getSumitConfig()).toMatchObject({ baseUrl: SUMIT_BASE_URL, companyId: 123456, apiKey: "secret-api-key-for-tests", apiPublicKey: "public-key-for-tests" });
    expect(SUMIT_BASE_URL).toBe("https://api.sumit.co.il");
  });

  it("the dry run is ON unless SUMIT_DRY_RUN is exactly 'false'", () => {
    expect(parseSumitDryRun(undefined)).toBe(true);
    expect(parseSumitDryRun("")).toBe(true);
    expect(parseSumitDryRun("true")).toBe(true);
    expect(parseSumitDryRun("0")).toBe(true);
    expect(parseSumitDryRun("no")).toBe(true);
    expect(parseSumitDryRun("false")).toBe(false);
    expect(parseSumitDryRun(" FALSE ")).toBe(false);
    configure();
    expect(getSumitConfig()?.dryRun).toBe(true);
    configure({ SUMIT_DRY_RUN: "false" });
    expect(getSumitConfig()?.dryRun).toBe(false);
  });

  it("test emails: trimmed, lower-cased, de-duplicated, junk dropped", () => {
    expect(parseSumitTestEmails(undefined)).toEqual([]);
    expect(parseSumitTestEmails(" A@x.com, b@y.com ,a@x.com,nope,,")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("who may use the SUMIT step: only listed emails during the dry run, everyone after it", () => {
    const dry = { dryRun: true, testEmails: ["a@x.com"] };
    expect(isSumitAvailableForEmail(dry, "A@x.com")).toBe(true);
    expect(isSumitAvailableForEmail(dry, "other@x.com")).toBe(false);
    expect(isSumitAvailableForEmail(dry, null)).toBe(false);
    expect(isSumitAvailableForEmail({ dryRun: false, testEmails: [] }, "anyone@x.com")).toBe(true);
  });
});

describe("the approved test organization guard (separate from the dry run)", () => {
  const problemsOf = () => getSumitConfigurationProblems().map((entry) => `${entry.variable}: ${entry.problem}`);

  it("SUMIT_ENVIRONMENT is required and must be 'test' or 'production' - there is no default", () => {
    expect(parseSumitEnvironment("test")).toBe("test");
    expect(parseSumitEnvironment(" PRODUCTION ")).toBe("production");
    for (const bad of [undefined, "", "sandbox", "live", "dev", "testing"]) expect(parseSumitEnvironment(bad), String(bad)).toBeNull();
    configure();
    delete process.env.SUMIT_ENVIRONMENT;
    expect(getSumitConfig()).toBeNull();
    expect(problemsOf()).toEqual(['SUMIT_ENVIRONMENT: missing or not "test" | "production"']);
    process.env.SUMIT_ENVIRONMENT = "sandbox";
    expect(getSumitConfig()).toBeNull();
  });

  it("test: the configured organization must BE the approved test organization", () => {
    configure();
    expect(getSumitConfig()).toMatchObject({ environment: "test", companyId: 123456 });
    // a real (different) organization while the deployment says 'test': refused
    configure({ SUMIT_COMPANY_ID: "999111" });
    expect(getSumitConfig()).toBeNull();
    expect(problemsOf()).toEqual(["SUMIT_COMPANY_ID: is not the approved test organization (SUMIT_TEST_COMPANY_ID)"]);
    // the approved test organization is required, and must be valid
    configure();
    delete process.env.SUMIT_TEST_COMPANY_ID;
    expect(getSumitConfig()).toBeNull();
    expect(problemsOf()).toEqual(["SUMIT_TEST_COMPANY_ID: missing or not a positive integer (the approved test organization)"]);
    process.env.SUMIT_TEST_COMPANY_ID = "abc";
    expect(getSumitConfig()).toBeNull();
  });

  it("production is LOCKED: it needs the explicit unlock, and may never be the approved test organization", () => {
    configure({ SUMIT_ENVIRONMENT: "production", SUMIT_COMPANY_ID: "999111" });
    expect(getSumitConfig()).toBeNull();
    expect(problemsOf()).toEqual(['SUMIT_ALLOW_PRODUCTION: production is locked: it must be exactly "true"']);
    for (const wrong of ["TRUE", "1", "yes", "false", ""]) {
      process.env.SUMIT_ALLOW_PRODUCTION = wrong;
      expect(getSumitConfig(), wrong).toBeNull();
    }
    process.env.SUMIT_ALLOW_PRODUCTION = "true";
    expect(getSumitConfig()).toMatchObject({ environment: "production", companyId: 999111 });
    // production pointing at the approved TEST organization is a configuration mistake
    configure({ SUMIT_ENVIRONMENT: "production", SUMIT_ALLOW_PRODUCTION: "true" });
    expect(getSumitConfig()).toBeNull();
    expect(problemsOf()).toEqual(["SUMIT_COMPANY_ID: is the approved test organization, which is not allowed in production"]);
  });

  it("SUMIT_DRY_RUN does NOT prove the test organization: a dry run against the wrong organization is still refused, and the test organization is accepted with the dry run off", () => {
    configure({ SUMIT_COMPANY_ID: "999111", SUMIT_DRY_RUN: "true" });
    expect(getSumitConfig()).toBeNull();
    configure({ SUMIT_DRY_RUN: "false" });
    expect(getSumitConfig()).toMatchObject({ environment: "test", dryRun: false });
  });

  it("the problems name variables and a short reason - never a value", () => {
    configure({ SUMIT_COMPANY_ID: "999111" });
    process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
    expect(JSON.stringify(getSumitConfigurationProblems())).not.toMatch(/secret-api-key-for-tests|999111|123456/);
  });
});
