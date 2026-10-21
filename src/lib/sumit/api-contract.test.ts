import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { chargeSumitCustomer, createSumitCustomer, getSumitPayment, getSumitPaymentMethod, listSumitPayments, removeSumitPaymentMethod, setSumitPaymentMethod } from "./client";
import contract from "./__fixtures__/sumit-api-contract.json";

/**
 * CONTRACT TEST against SUMIT's official OpenAPI (api.sumit.co.il/swagger/v1/swagger.json), vendored as a small fixture of
 * PROPERTY NAMES only (no examples, no keys). Every request body our client builds - dry-run and live - must use only
 * properties the official schema defines (with enum values SUMIT accepts), and every response field our mappers read must be
 * one the official schema declares. A typo, a renamed field or a wrong enum fails here instead of at SUMIT.
 */

type Tree = true | { $enum: unknown[] } | { $cycle: true } | { "[]": Tree | null } | { [key: string]: Tree | null };
const endpoints = contract.endpoints as unknown as Record<string, { request: Tree; responseData: Tree | null; responseEnvelope: string[] }>;

function unknownPaths(value: unknown, shape: Tree | null, at: string): string[] {
  if (shape === null || shape === true || (typeof shape === "object" && "$cycle" in shape)) return [];
  if (typeof shape === "object" && "$enum" in shape) return (shape.$enum as unknown[]).includes(value) ? [] : [`${at}=${String(value)} is not an allowed enum value`];
  if (Array.isArray(value)) {
    const item = (shape as { "[]"?: Tree | null })["[]"];
    return item === undefined ? [`${at} is not an array in the schema`] : value.flatMap((entry, index) => unknownPaths(entry, item, `${at}[${index}]`));
  }
  if (value && typeof value === "object") {
    const props = shape as Record<string, Tree | null>;
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => (key in props ? unknownPaths(child, props[key], `${at}.${key}`) : [`${at}.${key} is not in the official schema`]));
  }
  return [];
}

const fetchMock = vi.fn();
const bodies: Array<{ path: string; body: unknown }> = [];

beforeEach(() => {
  bodies.length = 0;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456"; // the approved test organization = the configured one
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    bodies.push({ path: String(url).replace("https://api.sumit.co.il", ""), body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ Status: 0, Data: { CustomerID: 77, PaymentMethod: { ID: 5, CustomerID: 77, CreditCard_CardMask: "458045******4580" }, Payment: { ID: 900, ValidPayment: true, Amount: 39 }, Payments: [], HasNextPage: false } }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_ALLOW_PRODUCTION", "SUMIT_DRY_RUN"]) delete process.env[key];
});

const charge = { customerId: "77", amountAgorot: 3900, description: "Plus - Naveh Shamir", documentDescription: "Plus (sumit:sub-1:2026-11-20:1)", vatIncluded: true, sendDocumentByEmail: true };

describe("every request our client builds matches the official SUMIT schema", () => {
  it("covers all seven endpoints, in dry-run and live mode", async () => {
    await createSumitCustomer({ externalId: "reg-1", name: "Noa Levi", email: "noa@example.com", phone: "0545218644" });
    await setSumitPaymentMethod({ customerId: "77", singleUseToken: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" });
    await getSumitPaymentMethod("77");
    await removeSumitPaymentMethod("77");
    await chargeSumitCustomer(charge); // dry run (default)
    process.env.SUMIT_DRY_RUN = "false";
    await chargeSumitCustomer(charge); // live
    await getSumitPayment("900");
    await listSumitPayments({ dateFrom: new Date("2026-10-01T00:00:00Z"), dateTo: new Date("2026-10-02T00:00:00Z"), valid: true, startIndex: 0 });

    expect(bodies.map((entry) => entry.path)).toEqual([
      "/accounting/customers/create/",
      "/billing/paymentmethods/setforcustomer/",
      "/billing/paymentmethods/getforcustomer/",
      "/billing/paymentmethods/remove/",
      "/billing/payments/charge/",
      "/billing/payments/charge/",
      "/billing/payments/get/",
      "/billing/payments/list/",
    ]);
    for (const { path: endpoint, body } of bodies) {
      expect(endpoints[endpoint], endpoint).toBeDefined();
      expect(unknownPaths(body, endpoints[endpoint].request, endpoint), endpoint).toEqual([]);
    }
  });

  it("the endpoints our client names are exactly the official ones (and none is a recurring endpoint)", () => {
    expect(Object.keys(endpoints).sort()).toEqual([
      "/accounting/customers/create/",
      "/billing/paymentmethods/getforcustomer/",
      "/billing/paymentmethods/remove/",
      "/billing/paymentmethods/setforcustomer/",
      "/billing/payments/charge/",
      "/billing/payments/get/",
      "/billing/payments/list/",
    ]);
    const source = readFileSync(path.resolve(__dirname, "client.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const used = [...source.matchAll(/post\(\s*config,\s*"(\/[^"]+)"/g)].map((match) => match[1]).sort();
    expect(used).toEqual(Object.keys(endpoints).sort());
  });

  it("the save-payment-method request carries ONLY the customer id and the one-time token - no card fields", async () => {
    await setSumitPaymentMethod({ customerId: "77", singleUseToken: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" });
    expect(Object.keys(bodies[0].body as object).sort()).toEqual(["Credentials", "Customer", "SingleUseToken"]);
  });

  it("the charge of a SAVED method names the customer and the items - never a payment method, a token or card fields", async () => {
    process.env.SUMIT_DRY_RUN = "false";
    await chargeSumitCustomer(charge);
    const body = bodies[0].body as Record<string, unknown>;
    expect(body.Customer).toEqual({ ID: 77 });
    for (const forbidden of ["PaymentMethod", "SingleUseToken", "CreditCardAuthNumber", "CardTokenNotNeeded"]) expect(body, forbidden).not.toHaveProperty(forbidden);
    expect(body).toMatchObject({ VATIncluded: true, SendDocumentByEmail: true });
  });
});

describe("every response field our code reads exists in the official schema", () => {
  const readFields = (source: string, variable: string): string[] => [...new Set([...source.matchAll(new RegExp(`\\b${variable}\\.([A-Za-z_]+)`, "g")).map((match) => match[1])])].sort();
  const source = readFileSync(path.resolve(__dirname, "client.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // the response mappers are where raw SUMIT fields are read; the rest of the file works on our own mapped objects
  const mappers = source.slice(source.indexOf("export function mapSumitPaymentMethod"), source.indexOf("export async function createSumitCustomer"));
  const dataTree = (endpoint: string) => endpoints[endpoint].responseData as Record<string, Tree | null>;

  it("the envelope: Status, UserErrorMessage, TechnicalErrorDetails, Data", () => {
    for (const endpoint of Object.keys(endpoints)) expect(endpoints[endpoint].responseEnvelope, endpoint).toEqual(["Status", "UserErrorMessage", "TechnicalErrorDetails", "Data"]);
    expect(readFields(source, "envelope")).toEqual(["Data", "Status", "TechnicalErrorDetails", "UserErrorMessage"]);
  });

  it("Data of each endpoint", () => {
    const dataFields = readFields(source, "data");
    const known = new Set(Object.values(endpoints).flatMap((entry) => Object.keys((entry.responseData ?? {}) as object)));
    for (const field of dataFields) expect(known.has(field), `Data.${field}`).toBe(true);
  });

  it("Payment and PaymentMethod fields", () => {
    const payment = (dataTree("/billing/payments/charge/").Payment ?? {}) as Record<string, Tree | null>;
    const paymentFields = readFields(mappers, "payment");
    expect(paymentFields.length).toBeGreaterThan(5);
    for (const field of paymentFields) expect(field in payment, `Payment.${field}`).toBe(true);
    const method = (payment.PaymentMethod ?? {}) as Record<string, Tree | null>;
    const methodFields = readFields(mappers, "method");
    expect(methodFields.length).toBeGreaterThan(2);
    for (const field of methodFields) expect(field in method, `PaymentMethod.${field}`).toBe(true);
    expect(Object.keys(method)).toEqual(expect.arrayContaining(["ID", "CustomerID", "CreditCard_CardMask", "CreditCard_LastDigits", "CreditCard_Token"]));
  });
});
