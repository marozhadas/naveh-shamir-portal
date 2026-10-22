import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PaymentProviderError } from "@/domain/payments/payment-provider";
import { chargeSumitCustomer, createSumitCustomer, getSumitPayment, getSumitPaymentMethod, listSumitPayments, mapSumitPayment, mapSumitPaymentMethod, removeSumitPaymentMethod, setSumitPaymentMethod } from "./client";

const API_KEY = "secret-api-key-for-tests";
const PUBLIC_KEY = "public-key-for-tests";
const TOKEN = "11111111-2222-3333-4444-555555555555";
const KEYS = ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_ALLOW_PRODUCTION", "SUMIT_DRY_RUN"] as const;

const fetchMock = vi.fn();

/** The PaymentProviderError a call rejects with (fails the test if it did not reject). */
async function caught(promise: Promise<unknown>): Promise<PaymentProviderError> {
  try {
    await promise;
  } catch (error) {
    return error as PaymentProviderError;
  }
  throw new Error("expected the call to reject");
}

function configure(dryRun?: string) {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = API_KEY;
  process.env.SUMIT_API_PUBLIC_KEY = PUBLIC_KEY;
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456"; // the approved test organization = the configured one
  if (dryRun !== undefined) process.env.SUMIT_DRY_RUN = dryRun;
}

function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}
const ok = (data: unknown) => reply({ Status: 0, UserErrorMessage: null, TechnicalErrorDetails: null, Data: data });

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit, body: JSON.parse(String((init as RequestInit).body)) as Record<string, unknown> };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  configure();
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of KEYS) delete process.env[key];
});

describe("request shape", () => {
  it("every call is a JSON POST to api.sumit.co.il with the company credentials in the body (never in the URL or headers)", async () => {
    ok({ CustomerID: 77 });
    await createSumitCustomer({ externalId: "reg-1", name: "Noa" });
    const { url, init, body } = lastCall();
    expect(url).toBe("https://api.sumit.co.il/accounting/customers/create/");
    expect(init.method).toBe("POST");
    expect(body.Credentials).toEqual({ CompanyID: 123456, APIKey: API_KEY });
    expect(url).not.toContain(API_KEY);
    expect(JSON.stringify(init.headers)).not.toContain(API_KEY);
  });

  it("customers/create finds-or-creates by our external id", async () => {
    ok({ CustomerID: 77 });
    const result = await createSumitCustomer({ externalId: " reg-1 ", name: " Noa Levi ", email: "noa@example.com", phone: "0545218644" });
    expect(result).toEqual({ customerId: "77" });
    expect(lastCall().body.Details).toEqual({ Name: "Noa Levi", ExternalIdentifier: "reg-1", SearchMode: 2, EmailAddress: "noa@example.com", Phone: "0545218644" });
  });

  it("setforcustomer sends the one-time token and the customer id - and nothing about the card", async () => {
    ok({ CustomerID: 77, PaymentMethod: { ID: 5, CustomerID: 77, CreditCard_CardMask: "458045******4580" } });
    const result = await setSumitPaymentMethod({ customerId: "77", singleUseToken: TOKEN });
    const { url, body } = lastCall();
    expect(url).toBe("https://api.sumit.co.il/billing/paymentmethods/setforcustomer/");
    expect(body.Customer).toEqual({ ID: 77 });
    expect(body.SingleUseToken).toBe(TOKEN);
    expect(JSON.stringify(body)).not.toMatch(/CardNumber|CVV|Expiration|CitizenID|CreditCard_/);
    expect(result).toEqual({ customerId: "77", paymentMethod: { id: "5", customerId: "77", cardMask: "458045******4580" } });
  });

  it("getforcustomer / remove / get / list use the documented paths and bodies", async () => {
    ok({ PaymentMethod: { ID: 5, CreditCard_LastDigits: "4580" } });
    expect(await getSumitPaymentMethod("77")).toEqual({ id: "5", customerId: null, cardMask: "****4580" });
    expect(lastCall().url).toBe("https://api.sumit.co.il/billing/paymentmethods/getforcustomer/");
    expect(lastCall().body).toMatchObject({ Customer: { ID: 77 }, IncludeInactive: false });

    ok({});
    await removeSumitPaymentMethod("77");
    expect(lastCall().url).toBe("https://api.sumit.co.il/billing/paymentmethods/remove/");

    ok({ Payment: { ID: 900, ValidPayment: true, Amount: 39, CustomerID: 77 } });
    expect(await getSumitPayment("900")).toMatchObject({ id: "900", valid: true, amountAgorot: 3900 });
    expect(lastCall().url).toBe("https://api.sumit.co.il/billing/payments/get/");
    expect(lastCall().body.PaymentID).toBe(900);

    ok({ Payments: [{ ID: 1, Amount: 39.5, ValidPayment: false }], HasNextPage: true });
    const list = await listSumitPayments({ dateFrom: new Date("2026-10-01T00:00:00Z"), dateTo: new Date("2026-10-02T00:00:00Z"), valid: true });
    expect(list.hasNextPage).toBe(true);
    expect(list.payments).toHaveLength(1);
    expect(list.payments[0]).toMatchObject({ id: "1", amountAgorot: 3950, valid: false });
    expect(lastCall().url).toBe("https://api.sumit.co.il/billing/payments/list/");
    expect(lastCall().body).toMatchObject({ Date_From: "2026-10-01T00:00:00.000Z", Valid: true, StartIndex: 0 });
  });

  it("getPayment never infers 'no such payment' from an empty Success: it is an uncertain reply and throws", async () => {
    ok({});
    await expect(getSumitPayment("901")).rejects.toMatchObject({ kind: "invalid-response" });
    ok({ Payment: null });
    await expect(getSumitPayment("901")).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("getPayment refuses a reply about a different payment than the one asked for", async () => {
    ok({ Payment: { ID: 999, ValidPayment: true, Amount: 39 } });
    await expect(getSumitPayment("901")).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("a payments LIST that is malformed, has an unreadable row, or does not say whether there is a next page is an error - never an empty or partial list", async () => {
    const range = { dateFrom: new Date("2026-10-01T00:00:00Z"), dateTo: new Date("2026-10-02T00:00:00Z") };
    for (const data of [{}, { Payments: "x", HasNextPage: false }, { Payments: [], HasNextPage: "no" }, { Payments: [] }, { Payments: [{ ID: 1, Amount: 39 }], HasNextPage: false }, { Payments: [{ ID: 1, Amount: 39, ValidPayment: true }, { nope: true }], HasNextPage: false }]) {
      ok(data);
      await expect(listSumitPayments(range), JSON.stringify(data)).rejects.toMatchObject({ kind: "invalid-response" });
    }
    ok({ Payments: [], HasNextPage: false });
    expect(await listSumitPayments(range)).toEqual({ payments: [], hasNextPage: false });
  });

  it("getforcustomer: a missing method is 'none', a malformed one is an error", async () => {
    ok({ PaymentMethod: null });
    expect(await getSumitPaymentMethod("77")).toBeNull();
    ok({});
    expect(await getSumitPaymentMethod("77")).toBeNull();
    ok({ PaymentMethod: "oops" });
    await expect(getSumitPaymentMethod("77")).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("recurring endpoints are never called", async () => {
    ok({ CustomerID: 1 });
    await createSumitCustomer({ externalId: "a", name: "b" });
    for (const [url] of fetchMock.mock.calls) expect(url as string).not.toContain("/billing/recurring/");
  });
});

describe("charge", () => {
  const request = { customerId: "77", amountAgorot: 3900, description: "Plus - Naveh Shamir", documentDescription: "Plus (key-1)", vatIncluded: true, sendDocumentByEmail: false };

  it("charges the customer's SAVED method: no token, no card, ILS converted at the edge, VAT explicit", async () => {
    configure("false");
    ok({ Payment: { ID: 900, ValidPayment: true, Amount: 39, CustomerID: 77, Date: "2026-10-20T10:00:00Z" }, DocumentDownloadURL: "https://app.sumit.co.il/d/x" });
    const result = await chargeSumitCustomer(request);
    const { url, body } = lastCall();
    expect(url).toBe("https://api.sumit.co.il/billing/payments/charge/");
    expect(body.Customer).toEqual({ ID: 77 });
    expect(body.PaymentMethod).toBeUndefined();
    expect(body.SingleUseToken).toBeUndefined();
    expect(body.Items).toEqual([{ Item: { Name: "Plus - Naveh Shamir" }, Quantity: 1, UnitPrice: 39, Currency: 0, Description: "Plus - Naveh Shamir" }]);
    expect(body.VATIncluded).toBe(true);
    expect(body.AuthoriseOnly).toBeUndefined();
    expect(result.authoriseOnly).toBe(false);
    expect(result.payment).toMatchObject({ id: "900", valid: true, amountAgorot: 3900 });
    expect(result.documentUrl).toBe("https://app.sumit.co.il/d/x");
  });

  it("DRY RUN (the default): the charge is authorise-only with a draft document", async () => {
    ok({ Payment: { ID: 901, ValidPayment: true, Amount: 39 } });
    const result = await chargeSumitCustomer(request);
    expect(lastCall().body).toMatchObject({ AuthoriseOnly: true, DraftDocument: true });
    expect(result.authoriseOnly).toBe(true);
  });

  it("only an https document link is kept", async () => {
    ok({ Payment: { ID: 902, ValidPayment: true, Amount: 39 }, DocumentDownloadURL: "http://insecure.example/x" });
    expect((await chargeSumitCustomer(request)).documentUrl).toBeNull();
  });

  it("refuses bad amounts / ids before any request", async () => {
    for (const amountAgorot of [0, -100, 39.5, Number.NaN]) {
      await expect(chargeSumitCustomer({ ...request, amountAgorot })).rejects.toMatchObject({ kind: "invalid-input" });
    }
    await expect(chargeSumitCustomer({ ...request, customerId: "abc" })).rejects.toMatchObject({ kind: "invalid-input" });
    await expect(chargeSumitCustomer({ ...request, description: " " })).rejects.toMatchObject({ kind: "invalid-input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("an unreadable payment in a Success reply is an error, never a charge", async () => {
    ok({ Payment: { ID: "oops", Amount: "x" } });
    await expect(chargeSumitCustomer(request)).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("a payment whose ValidPayment is missing or not a boolean is UNREADABLE (uncertain), not 'false' (a certain failure)", async () => {
    for (const ValidPayment of [undefined, null, "true", "false", 1, 0, "yes"]) {
      ok({ Payment: { ID: 900, Amount: 39, ...(ValidPayment === undefined ? {} : { ValidPayment }) } });
      await expect(chargeSumitCustomer(request), String(ValidPayment)).rejects.toMatchObject({ kind: "invalid-response" });
    }
    expect(mapSumitPayment({ ID: 900, Amount: 39 })).toBeNull();
    expect(mapSumitPayment({ ID: 900, Amount: 39, ValidPayment: "true" })).toBeNull();
    expect(mapSumitPayment({ ID: 900, Amount: 39, ValidPayment: false })).toMatchObject({ valid: false });
    expect(mapSumitPayment({ ID: 900, Amount: 39, ValidPayment: true })).toMatchObject({ valid: true });
  });

  it("a Success reply that disagrees with the request is not trusted: another customer, or an amount that does not fit", async () => {
    // VAT included: the paid amount must equal the requested amount exactly
    ok({ Payment: { ID: 900, CustomerID: 78, ValidPayment: true, Amount: 39 } });
    await expect(chargeSumitCustomer(request)).rejects.toMatchObject({ kind: "invalid-response" });
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 40 } });
    await expect(chargeSumitCustomer(request)).rejects.toMatchObject({ kind: "invalid-response" });
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 38.99 } });
    await expect(chargeSumitCustomer(request)).rejects.toMatchObject({ kind: "invalid-response" });
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 39 } });
    expect((await chargeSumitCustomer(request)).payment.amountAgorot).toBe(3900);
    // VAT not included: documented only as "defaults to false"; the amount may be higher (VAT added) but never lower
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 46.02 } });
    expect((await chargeSumitCustomer({ ...request, vatIncluded: false })).payment.amountAgorot).toBe(4602);
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 30 } });
    await expect(chargeSumitCustomer({ ...request, vatIncluded: false })).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("the amount is 'proven' only for a VAT-included price paid exactly; with VAT not included it is never proven (the rules are unverified)", async () => {
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 39 } });
    expect((await chargeSumitCustomer(request)).amountProven).toBe(true);
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 39 } });
    expect((await chargeSumitCustomer({ ...request, vatIncluded: false })).amountProven).toBe(false);
    ok({ Payment: { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 46.02 } });
    expect((await chargeSumitCustomer({ ...request, vatIncluded: false })).amountProven).toBe(false);
  });

  describe("document id (observed: Data.DocumentID on the charge reply, Payment.DocumentID on a later read)", () => {
    const paid = { ID: 900, CustomerID: 77, ValidPayment: true, Amount: 39 };

    it("takes the id from Data.DocumentID when Payment.DocumentID is 0 (the observed charge reply)", async () => {
      ok({ Payment: { ...paid, DocumentID: 0 }, DocumentID: 2503151205, DocumentNumber: 10000 });
      expect((await chargeSumitCustomer(request)).payment.documentId).toBe("2503151205");
    });

    it("takes the id from Payment.DocumentID when Data has none, and when both agree", async () => {
      ok({ Payment: { ...paid, DocumentID: 31 } });
      expect((await chargeSumitCustomer(request)).payment.documentId).toBe("31");
      ok({ Payment: { ...paid, DocumentID: 31 }, DocumentID: 31 });
      expect((await chargeSumitCustomer(request)).payment.documentId).toBe("31");
      ok({ Payment: { ...paid, DocumentID: 31 }, DocumentID: 0 });
      expect((await chargeSumitCustomer(request)).payment.documentId).toBe("31");
    });

    it("only a positive integer is an id: 0, negative, fractional, text and null mean 'no document'", async () => {
      for (const bad of [0, -5, 1.5, "abc", "", null, true, {}]) {
        ok({ Payment: { ...paid, DocumentID: bad }, DocumentID: bad });
        expect((await chargeSumitCustomer(request)).payment.documentId, JSON.stringify(bad)).toBeNull();
      }
      ok({ Payment: paid });
      expect((await chargeSumitCustomer(request)).payment.documentId).toBeNull();
    });

    it("two different valid ids are a contradiction: the reply is not trusted (invalid-response, naming the payment id, no document id guessed)", async () => {
      ok({ Payment: { ...paid, DocumentID: 31 }, DocumentID: 32 });
      const error = await caught(chargeSumitCustomer(request));
      expect(error).toMatchObject({ kind: "invalid-response" });
      expect(error.message).toContain("900"); // internal message for reconciliation; never the user-facing `detail`
      expect(error.detail).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1); // and no retry
    });

    it("a valid id on one side and garbage on the other is not a conflict - the valid one wins", async () => {
      ok({ Payment: { ...paid, DocumentID: "garbage" }, DocumentID: 32 });
      expect((await chargeSumitCustomer(request)).payment.documentId).toBe("32");
    });
  });

  it("a BusinessError on a charge is thrown as 'rejected' - the client never turns it into a payment (SUMIT does not document it as 'nothing was charged')", async () => {
    reply({ Status: 1, UserErrorMessage: "העסקה נדחתה", Data: null });
    await expect(chargeSumitCustomer(request)).rejects.toMatchObject({ kind: "rejected", detail: "העסקה נדחתה" });
  });
});

describe("input validation (nothing is sent)", () => {
  it("rejects an empty name / external id, a malformed token and a malformed customer id", async () => {
    await expect(createSumitCustomer({ externalId: "r", name: "  " })).rejects.toMatchObject({ kind: "invalid-input" });
    await expect(createSumitCustomer({ externalId: " ", name: "n" })).rejects.toMatchObject({ kind: "invalid-input" });
    await expect(setSumitPaymentMethod({ customerId: "77", singleUseToken: "short" })).rejects.toMatchObject({ kind: "invalid-input" });
    await expect(setSumitPaymentMethod({ customerId: "7 7", singleUseToken: TOKEN })).rejects.toMatchObject({ kind: "invalid-input" });
    await expect(getSumitPayment("1; drop")).rejects.toMatchObject({ kind: "invalid-input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is not-configured (and sends nothing) when the credentials are missing", async () => {
    delete process.env.SUMIT_API_KEY;
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("error handling", () => {
  it("BusinessError -> 'rejected' with SUMIT's own short message as detail", async () => {
    reply({ Status: 1, UserErrorMessage: "הכרטיס נדחה", TechnicalErrorDetails: "internal-detail", Data: null });
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "rejected", detail: "הכרטיס נדחה" });
  });

  it("TechnicalError -> 'provider-error'; Status given by name is understood too", async () => {
    reply({ Status: 2, TechnicalErrorDetails: "boom", Data: null });
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "provider-error" });
    reply({ Status: "BusinessError", UserErrorMessage: "no", Data: null });
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "rejected" });
    ok({ CustomerID: 5 });
    expect(await createSumitCustomer({ externalId: "r", name: "n" })).toEqual({ customerId: "5" });
  });

  it("a reply with no readable Status is never treated as success", async () => {
    reply({ Data: { CustomerID: 9 } });
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "invalid-response" });
    reply({ Status: 99, Data: {} });
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("network failure / timeout -> 'network'; non-JSON -> 'invalid-response'; Success with a bad HTTP status -> 'invalid-response'", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "network" });
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "invalid-response" });
    reply({ Status: 0, Data: { CustomerID: 1 } }, 500);
    await expect(createSumitCustomer({ externalId: "r", name: "n" })).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("secrets never leave in an error: API key, public key and the token are redacted", async () => {
    fetchMock.mockRejectedValueOnce(new Error(`failed for ${API_KEY} and ${PUBLIC_KEY}`));
    const networkError = await caught(createSumitCustomer({ externalId: "r", name: "n" }));
    expect(networkError.message).not.toContain(API_KEY);
    expect(networkError.message).not.toContain(PUBLIC_KEY);
    expect(networkError.message).toContain("[redacted]");

    reply({ Status: 1, UserErrorMessage: `bad token ${TOKEN}`, Data: null });
    const rejected = await caught(setSumitPaymentMethod({ customerId: "77", singleUseToken: TOKEN }));
    expect(rejected.message).not.toContain(TOKEN);
    expect(rejected.detail).not.toContain(TOKEN);
  });
});

describe("mappers pick a whitelist - sensitive fields are never carried", () => {
  const sensitive = { ID: 5, CustomerID: 77, CreditCard_Number: "4580458045804580", CreditCard_CVV: "123", CreditCard_Track2: "t2", CreditCard_CitizenID: "123456789", CreditCard_Token: "perm-token-xyz", CreditCard_ExpirationMonth: 12, CreditCard_ExpirationYear: 2030, CreditCard_CardMask: "458045******4580" };

  it("payment method: id, customer id and mask only", () => {
    const mapped = mapSumitPaymentMethod(sensitive);
    expect(mapped).toEqual({ id: "5", customerId: "77", cardMask: "458045******4580" });
    const text = JSON.stringify(mapped);
    for (const forbidden of ["4580458045804580", "123456789", "perm-token-xyz", "t2", "2030"]) expect(text).not.toContain(forbidden);
  });

  it("an odd mask is dropped rather than passed along", () => {
    expect(mapSumitPaymentMethod({ ID: 1, CreditCard_CardMask: "4580458045804580 <script>" })?.cardMask).toBeNull();
    expect(mapSumitPaymentMethod(null)).toBeNull();
  });

  it("payment: a whitelist, with the amount converted to integer agorot", () => {
    const mapped = mapSumitPayment({ ID: 9, CustomerID: 77, ValidPayment: true, Amount: 49, Status: "OK", PaymentMethod: sensitive, DocumentID: 31 });
    expect(mapped).toMatchObject({ id: "9", customerId: "77", valid: true, amountAgorot: 4900, cardMask: "458045******4580", documentId: "31" });
    expect(JSON.stringify(mapped)).not.toMatch(/perm-token-xyz|4580458045804580|123456789/);
    expect(mapSumitPayment({ ID: 0, Amount: 5 })).toBeNull();
    expect(mapSumitPayment({ ID: 3, Amount: -1 })).toBeNull();
  });
});
