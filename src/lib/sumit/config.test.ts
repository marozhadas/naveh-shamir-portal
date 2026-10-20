import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SUMIT_BASE_URL, getMissingSumitVariables, getSumitConfig, isSumitAvailableForEmail, isSumitConfigured, parseSumitCompanyId, parseSumitDryRun, parseSumitTestEmails } from "./config";

const KEYS = ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_DRY_RUN", "SUMIT_TEST_EMAILS"] as const;

function configure(overrides: Partial<Record<(typeof KEYS)[number], string>> = {}) {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
}

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("SUMIT configuration", () => {
  it("is off until the three required variables exist", () => {
    expect(getSumitConfig()).toBeNull();
    expect(isSumitConfigured()).toBe(false);
    expect(getMissingSumitVariables()).toEqual(["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY"]);
    configure();
    expect(isSumitConfigured()).toBe(true);
    expect(getMissingSumitVariables()).toEqual([]);
  });

  it("the missing list names variables only, never values", () => {
    process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
    expect(JSON.stringify(getMissingSumitVariables())).not.toContain("secret-api-key-for-tests");
    expect(getMissingSumitVariables()).toEqual(["SUMIT_COMPANY_ID", "SUMIT_API_PUBLIC_KEY"]);
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
