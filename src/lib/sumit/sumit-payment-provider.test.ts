import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PaymentProviderError, type PaymentProvider } from "@/domain/payments/payment-provider";
import { MAX_CHARGE_AGOROT, createSumitPaymentProvider } from "./sumit-payment-provider";

const TOKEN = "11111111-2222-3333-4444-555555555555";
const KEYS = ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_ALLOW_PRODUCTION", "SUMIT_DRY_RUN"] as const;
const fetchMock = vi.fn();

function configure(dryRun?: string) {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456"; // the approved test organization = the configured one
  if (dryRun !== undefined) process.env.SUMIT_DRY_RUN = dryRun;
}
const reply = (body: unknown) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
const ok = (data: unknown) => reply({ Status: 0, Data: data });
const paths = () => fetchMock.mock.calls.map(([url]) => String(url).replace("https://api.sumit.co.il", ""));
const bodyOf = (index: number) => JSON.parse(String((fetchMock.mock.calls[index][1] as RequestInit).body)) as Record<string, unknown>;

const charge = { customerId: "77", amountAgorot: 3900, description: "Plus - Naveh Shamir", uniqueKey: "sumit:sub-1:2026-11-20:1", vatIncluded: true };

let provider: PaymentProvider;
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  configure();
  provider = createSumitPaymentProvider();
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of KEYS) delete process.env[key];
});

describe("the domain interface", () => {
  it("is a SUMIT provider exposing exactly the five operations - no recurring", () => {
    expect(provider.id).toBe("sumit");
    expect(Object.keys(provider).filter((key) => typeof provider[key as keyof PaymentProvider] === "function").sort()).toEqual(["charge", "getPayment", "getPaymentMethod", "removePaymentMethod", "savePaymentMethod"]);
  });

  it("reports the dry run from the configuration (ON by default)", () => {
    expect(provider.dryRun).toBe(true);
    configure("false");
    expect(provider.dryRun).toBe(false);
  });
});

describe("savePaymentMethod", () => {
  it("creates (or finds) the customer, then attaches the card from the one-time token - and charges nothing", async () => {
    ok({ CustomerID: 77 });
    ok({ CustomerID: 77, PaymentMethod: { ID: 5, CreditCard_CardMask: "458045******4580" } });
    const saved = await provider.savePaymentMethod({ externalCustomerId: "reg-1", customer: { name: "Noa", email: "noa@example.com" }, paymentToken: TOKEN });
    expect(saved).toEqual({ customerId: "77", paymentMethodId: "5", cardMask: "458045******4580" });
    expect(paths()).toEqual(["/accounting/customers/create/", "/billing/paymentmethods/setforcustomer/"]);
    expect(bodyOf(1).Customer).toEqual({ ID: 77 });
    expect(paths().some((path) => path.includes("charge"))).toBe(false);
  });

  it("if saving the card fails, the error reaches the caller (no half-saved state is reported)", async () => {
    ok({ CustomerID: 77 });
    reply({ Status: 1, UserErrorMessage: "invalid token", Data: null });
    await expect(provider.savePaymentMethod({ externalCustomerId: "reg-1", customer: { name: "Noa" }, paymentToken: TOKEN })).rejects.toMatchObject({ kind: "rejected" });
  });

  it("the result never carries the token or any card detail beyond the mask", async () => {
    ok({ CustomerID: 77 });
    ok({ CustomerID: 77, PaymentMethod: { ID: 5, CreditCard_CardMask: "458045******4580", CreditCard_Token: "perm-xyz-token", CreditCard_Number: "4580458045804580" } });
    const saved = await provider.savePaymentMethod({ externalCustomerId: "reg-1", customer: { name: "Noa" }, paymentToken: TOKEN });
    expect(JSON.stringify(saved)).not.toMatch(/perm-xyz-token|4580458045804580/);
    expect(JSON.stringify(saved)).not.toContain(TOKEN);
  });
});

describe("getPaymentMethod / removePaymentMethod / getPayment", () => {
  it("getPaymentMethod: the saved method, or null when there is none", async () => {
    ok({ PaymentMethod: { ID: 5, CreditCard_CardMask: "458045******4580" } });
    expect(await provider.getPaymentMethod("77")).toEqual({ customerId: "77", paymentMethodId: "5", cardMask: "458045******4580" });
    ok({ PaymentMethod: null });
    expect(await provider.getPaymentMethod("77")).toBeNull();
  });

  it("removePaymentMethod calls the remove endpoint", async () => {
    ok({});
    await provider.removePaymentMethod("77");
    expect(paths()).toEqual(["/billing/paymentmethods/remove/"]);
  });

  it("getPayment is a READ-BACK: a valid payment is only 'unconfirmed' (mode unknown) - never 'succeeded' - whatever the dry-run setting is NOW", async () => {
    for (const dryRun of [undefined, "true", "false"]) {
      if (dryRun === undefined) delete process.env.SUMIT_DRY_RUN;
      else process.env.SUMIT_DRY_RUN = dryRun;
      ok({ Payment: { ID: 900, ValidPayment: true, Amount: 39, CustomerID: 77 } });
      const result = await provider.getPayment("900");
      expect(result, String(dryRun)).toMatchObject({ paymentId: "900", status: "unconfirmed", mode: "unknown", amountAgorot: 3900, customerId: "77", failureReason: null });
      expect(result.status).not.toBe("succeeded");
    }
  });

  it("getPayment: an explicitly invalid payment is 'failed'; a missing or unreadable one THROWS (absence is never inferred)", async () => {
    ok({ Payment: { ID: 901, ValidPayment: false, Amount: 39, StatusDescription: "declined" } });
    expect(await provider.getPayment("901")).toMatchObject({ status: "failed", mode: "unknown", failureReason: "declined" });
    ok({});
    await expect(provider.getPayment("902")).rejects.toMatchObject({ kind: "invalid-response" });
    ok({ Payment: { ID: 903, Amount: 39 } }); // ValidPayment missing
    await expect(provider.getPayment("903")).rejects.toMatchObject({ kind: "invalid-response" });
    reply({ Status: 1, UserErrorMessage: "not found", Data: null });
    await expect(provider.getPayment("904")).rejects.toMatchObject({ kind: "rejected" });
  });
});

describe("charge", () => {
  it("LIVE: a valid payment is 'succeeded' with the SUMIT payment id and the document link", async () => {
    configure("false");
    ok({ Payment: { ID: 900, ValidPayment: true, Amount: 39, CustomerID: 77 }, DocumentDownloadURL: "https://app.sumit.co.il/d/1" });
    const result = await provider.charge(charge);
    expect(result).toMatchObject({ paymentId: "900", status: "succeeded", mode: "capture", amountAgorot: 3900, documentUrl: "https://app.sumit.co.il/d/1", failureReason: null });
    expect(bodyOf(0).AuthoriseOnly).toBeUndefined();
    expect(bodyOf(0).VATIncluded).toBe(true);
    expect(String(bodyOf(0).DocumentDescription)).toContain(charge.uniqueKey);
  });

  it("DRY RUN: the result is 'authorised' - never 'succeeded' - so nothing can be booked as revenue", async () => {
    ok({ Payment: { ID: 901, ValidPayment: true, Amount: 39 } });
    const result = await provider.charge(charge);
    expect(result).toMatchObject({ status: "authorised", mode: "authorise-only" });
    expect(bodyOf(0)).toMatchObject({ AuthoriseOnly: true, DraftDocument: true });
  });

  it("'succeeded' is claimed ONLY for a request that asked for a real charge: the mode is taken from the request at the moment of the call", async () => {
    // same SUMIT reply, two requests: the dry-run one is never 'succeeded'
    ok({ Payment: { ID: 901, ValidPayment: true, Amount: 39 } });
    expect((await provider.charge(charge)).status).toBe("authorised");
    configure("false");
    ok({ Payment: { ID: 901, ValidPayment: true, Amount: 39 } });
    expect((await provider.charge(charge)).status).toBe("succeeded");
  });

  it("a payment SUMIT marks not valid is a resolved 'failed' result with its description", async () => {
    configure("false");
    ok({ Payment: { ID: 902, ValidPayment: false, Amount: 39, StatusDescription: "card declined" } });
    expect(await provider.charge(charge)).toMatchObject({ paymentId: "902", status: "failed", mode: "capture", failureReason: "card declined" });
  });

  it("a BusinessError is NOT classified as a certain refusal: it THROWS 'rejected' (SUMIT does not document it as 'nothing was charged') and carries no result", async () => {
    configure("false");
    reply({ Status: 1, UserErrorMessage: "העסקה נדחתה", Data: null });
    await expect(provider.charge(charge)).rejects.toMatchObject({ kind: "rejected", detail: "העסקה נדחתה" });
  });

  it("an unreadable payment (ValidPayment missing / not a boolean) or one that disagrees with the request THROWS - uncertain, no automatic retry", async () => {
    configure("false");
    for (const payment of [{ ID: 900, Amount: 39 }, { ID: 900, Amount: 39, ValidPayment: "true" }, { ID: 900, Amount: 40, ValidPayment: true }, { ID: 900, CustomerID: 78, Amount: 39, ValidPayment: true }]) {
      ok({ Payment: payment });
      await expect(provider.charge(charge), JSON.stringify(payment)).rejects.toMatchObject({ kind: "invalid-response" });
    }
    expect(fetchMock).toHaveBeenCalledTimes(4); // exactly one request per charge: nothing retried
  });

  it("NO trustworthy answer THROWS - the outcome is unknown and must be reconciled, never retried blindly", async () => {
    configure("false");
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    await expect(provider.charge(charge)).rejects.toMatchObject({ kind: "network" });
    reply({ Status: 2, TechnicalErrorDetails: "boom", Data: null });
    await expect(provider.charge(charge)).rejects.toMatchObject({ kind: "provider-error" });
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 500 }));
    await expect(provider.charge(charge)).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("refuses an out-of-range amount or a missing idempotency key before any request", async () => {
    for (const amountAgorot of [0, -1, 39.5, MAX_CHARGE_AGOROT + 1]) {
      await expect(provider.charge({ ...charge, amountAgorot })).rejects.toBeInstanceOf(PaymentProviderError);
    }
    await expect(provider.charge({ ...charge, uniqueKey: "  " })).rejects.toMatchObject({ kind: "invalid-input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the ceiling still allows the highest plan price (490 ILS yearly)", () => {
    expect(MAX_CHARGE_AGOROT).toBeGreaterThanOrEqual(49_000);
  });
});
