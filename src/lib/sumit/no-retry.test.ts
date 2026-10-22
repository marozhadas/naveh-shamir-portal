import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { PaymentProviderError, type PaymentProvider } from "@/domain/payments/payment-provider";
import { createSumitPaymentProvider } from "./sumit-payment-provider";

/**
 * An uncertain charge outcome must NEVER be followed by another charge request: SUMIT has confirmed no idempotency mechanism for
 * payments/charge, so a second request after a timeout or an unreadable answer could charge twice. Whatever happens, exactly one
 * request is sent; the outcome is an error or an "unconfirmed" result, both of which mean "reconcile first".
 */

const fetchMock = vi.fn();
let provider: PaymentProvider;
const charge = { customerId: "77", amountAgorot: 3900, description: "Plus - Naveh Shamir", uniqueKey: "sumit:sub-1:2026-11-20:1", vatIncluded: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456";
  process.env.SUMIT_DRY_RUN = "false"; // a real (test-terminal) capture: the case where a second request would matter
  provider = createSumitPaymentProvider();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const key of ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_DRY_RUN"]) delete process.env[key];
});

const timeout = () => new DOMException("The operation was aborted due to timeout", "TimeoutError");

const scenarios: Array<{ label: string; respond: () => Promise<Response> }> = [
  { label: "a request timeout", respond: () => Promise.reject(timeout()) },
  { label: "a network failure", respond: () => Promise.reject(new TypeError("fetch failed")) },
  { label: "a connection reset", respond: () => Promise.reject(Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })) },
  { label: "an HTTP 502 with an HTML body", respond: async () => new Response("<html>bad gateway</html>", { status: 502 }) },
  { label: "an HTTP 500 with JSON", respond: async () => json({ Status: 0, Data: {} }, 500) },
  { label: "a TechnicalError", respond: async () => json({ Status: 2, TechnicalErrorDetails: "boom", Data: null }) },
  { label: "a BusinessError", respond: async () => json({ Status: 1, UserErrorMessage: "no", Data: null }) },
  { label: "a reply with no readable Status", respond: async () => json({ Data: {} }) },
  { label: "a Success with no payment", respond: async () => json({ Status: 0, Data: {} }) },
  { label: "a payment without ValidPayment", respond: async () => json({ Status: 0, Data: { Payment: { ID: 900, Amount: 39 } } }) },
  { label: "a payment of another customer", respond: async () => json({ Status: 0, Data: { Payment: { ID: 900, CustomerID: 78, ValidPayment: true, Amount: 39 } } }) },
  { label: "a payment with a different amount", respond: async () => json({ Status: 0, Data: { Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 40 } } }) },
  { label: "a payment marked not valid", respond: async () => json({ Status: 0, Data: { Payment: { ID: 900, CustomerID: 77, ValidPayment: false, Amount: 39 } } }) },
];

describe("exactly one charge request is sent, whatever the outcome", () => {
  for (const { label, respond } of scenarios) {
    it(`${label}: one request, no retry, nothing scheduled, and never 'succeeded'`, async () => {
      fetchMock.mockImplementation(respond);
      const outcome = await provider.charge(charge).then(
        (result) => ({ result, error: null as unknown }),
        (error: unknown) => ({ result: null, error }),
      );

      expect(outcome.error !== null || outcome.result?.status === "unconfirmed", label).toBe(true);
      if (outcome.error !== null) expect(outcome.error).toBeInstanceOf(PaymentProviderError);
      if (outcome.result) expect(outcome.result).toMatchObject({ status: "unconfirmed", requiresReconciliation: true });
      expect(outcome.result?.status).not.toBe("succeeded");

      // time passes: no timer, no background retry
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.sumit.co.il/billing/payments/charge/");
    });
  }

  it("the charge request carries a finite timeout, so a hung request ends by itself - as an uncertain error, not a retry", async () => {
    fetchMock.mockImplementation(async () => json({ Status: 0, Data: { Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 39 } } }));
    await provider.charge(charge);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.signal as AbortSignal).aborted).toBe(false);
  });

  it("a timeout is classified as 'network' (an unknown outcome that must be reconciled), carrying no secret", async () => {
    fetchMock.mockImplementation(() => Promise.reject(Object.assign(timeout(), { message: "timed out for secret-api-key-for-tests" })));
    const error = await provider.charge(charge).catch((caught: unknown) => caught as PaymentProviderError);
    expect(error).toMatchObject({ kind: "network" });
    expect((error as Error).message).not.toContain("secret-api-key-for-tests");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("static guard: the SUMIT code has no retry machinery", () => {
  const dir = __dirname;
  const sources = readdirSync(dir)
    .filter((name) => /\.ts$/.test(name) && !/\.test\./.test(name))
    .map((name) => ({ name, code: readFileSync(path.join(dir, name), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "") }));

  it("no retry, backoff, timer or unbounded loop anywhere in the SUMIT modules", () => {
    expect(sources.length).toBeGreaterThan(3);
    // payments-js.ts is the browser side of the card form: its ONE timeout (checked in the next test) only ends a silent attempt
    for (const { name, code } of sources.filter((entry) => entry.name !== "payments-js.ts")) expect(code, name).not.toMatch(/\bretry|retries|backoff|setTimeout|setInterval|while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/i);
  });

  it("the browser side (payments-js.ts) has no retry or loop: one CreateToken call per attempt, and a timeout that only gives up", () => {
    const code = sources.find((entry) => entry.name === "payments-js.ts")!.code;
    expect(code).not.toMatch(/\bretry|retries|backoff|setInterval|while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/i);
    expect(code.match(/CreateToken\(/g)?.length).toBe(1); // the single call
    expect(code.match(/setTimeout\(/g)?.length).toBe(1);
    const body = code.slice(code.indexOf("export function requestToken"), code.indexOf("// --- the card fields"));
    expect(body).not.toMatch(/\b(while|do)\b\s*[({]/);
  });

  it("chargeSumitCustomer sends a single request (one post call)", () => {
    const client = sources.find((entry) => entry.name === "client.ts")!.code;
    const body = client.slice(client.indexOf("export async function chargeSumitCustomer"), client.indexOf("export async function getSumitPayment("));
    expect(body.match(/\bpost\(/g)?.length).toBe(1);
  });

  it("the provider's charge calls the client once and has no loop around it", () => {
    const provider = sources.find((entry) => entry.name === "sumit-payment-provider.ts")!.code;
    const body = provider.slice(provider.indexOf("async charge("), provider.indexOf("async getPayment("));
    expect(body.match(/chargeSumitCustomer\(/g)?.length).toBe(1);
    expect(body).not.toMatch(/\b(for|while|do)\b\s*[({]/);
  });
});
