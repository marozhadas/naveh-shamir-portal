import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getSumitCompanyDetailsPresence, getSumitCompanyName } from "./client";
import { SUMIT_TEST_ORGANIZATION_MARKER, isSumitTestOrganizationName } from "./test-organization";

const fetchMock = vi.fn();
const reply = (body: unknown) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456";
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID"]) delete process.env[key];
});

describe("recognising the test organization (SUMIT documents: 'בדיקות' is added to the business name)", () => {
  it("only a name that carries the marker counts", () => {
    expect(SUMIT_TEST_ORGANIZATION_MARKER).toBe("בדיקות");
    expect(isSumitTestOrganizationName("סטודיו נועה - בדיקות")).toBe(true);
    expect(isSumitTestOrganizationName("בדיקות סטודיו נועה")).toBe(true);
    for (const name of ["סטודיו נועה", "Noa Studio", "", null, undefined]) expect(isSumitTestOrganizationName(name), String(name)).toBe(false);
  });

  it("the read-only organization call sends only the credentials and returns only the trimmed name", async () => {
    reply({ Status: 0, Data: { Company: { Name: "  סטודיו נועה בדיקות  ", EmailAddress: "owner@example.com", CorporateNumber: "514000123", Phone: "050-1234567" } } });
    const result = await getSumitCompanyName();
    expect(result).toEqual({ name: "סטודיו נועה בדיקות" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.sumit.co.il/website/companies/getdetails/");
    expect(Object.keys(JSON.parse(String((init as RequestInit).body)))).toEqual(["Credentials"]);
    // nothing else of the organization is carried out
    expect(JSON.stringify(result)).not.toMatch(/owner@example.com|514000123|050-1234567/);
  });

  it("an unreadable organization reply is an error, and a missing name is simply 'no marker'", async () => {
    reply({ Status: 0, Data: {} });
    await expect(getSumitCompanyName()).rejects.toMatchObject({ kind: "invalid-response" });
    reply({ Status: 0, Data: { Company: { Name: null } } });
    expect(await getSumitCompanyName()).toEqual({ name: null });
    expect(isSumitTestOrganizationName((await (async () => { reply({ Status: 0, Data: { Company: { Name: "" } } }); return getSumitCompanyName(); })()).name)).toBe(false);
  });
});

describe("organization details: presence only", () => {
  it("returns full/missing booleans and never a value", async () => {
    reply({ Status: 0, Data: { Company: { Name: "עסק בדיקות", CorporateNumber: "999999998", Phone: "050-1234567", Fax: "", English_Phone: null, EmailAddress: "owner@example.com" } } });
    const presence = await getSumitCompanyDetailsPresence();
    expect(presence).toEqual({ CorporateNumber: true, Phone: true, Fax: false, English_Phone: false, EmailAddress: true, DocumentsEmailAddress: false });
    expect(JSON.stringify(presence)).not.toMatch(/999999998|050-1234567|owner@example.com/);
  });

  it("a blank or whitespace-only value counts as missing; an unreadable reply is an error", async () => {
    reply({ Status: 0, Data: { Company: { CorporateNumber: "   ", Phone: "" } } });
    expect(await getSumitCompanyDetailsPresence()).toMatchObject({ CorporateNumber: false, Phone: false });
    reply({ Status: 0, Data: {} });
    await expect(getSumitCompanyDetailsPresence()).rejects.toMatchObject({ kind: "invalid-response" });
  });
});
