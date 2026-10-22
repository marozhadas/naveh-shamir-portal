import "server-only";
import { PaymentProviderError } from "@/domain/payments/payment-provider";
import { redactSecrets } from "@/lib/payments/redact-secrets";
import { getSumitConfig, type SumitConfig } from "./config";

/**
 * Thin server-side client for the SUMIT REST API (https://api.sumit.co.il - OpenAPI at /swagger/v1/swagger.json).
 * Every call is a JSON POST whose body carries `Credentials: { CompanyID, APIKey }`; every reply is the envelope
 * `{ Status, UserErrorMessage, TechnicalErrorDetails, Data }` with Status Success(0) | BusinessError(1) | TechnicalError(2).
 *
 * Endpoints (only these):
 *   /accounting/customers/create/        create the customer, or find the existing one (SearchMode ExternalIdentifier)
 *   /billing/paymentmethods/setforcustomer/   save the card (from a SingleUseToken) on the customer - no charge
 *   /billing/paymentmethods/getforcustomer/   read the saved method
 *   /billing/paymentmethods/remove/           delete it
 *   /billing/payments/charge/                 charge the customer's saved method (or only authorise, in a dry run)
 *   /billing/payments/get/  /billing/payments/list/   read payments back (for reconciliation)
 *   /website/companies/getdetails/            read-only: the organization's name - used ONLY by the local test lab to attest that the
 *                                             keys belong to the test organization (SUMIT adds "בדיקות" to a test organization's name)
 * Recurring (/billing/recurring/*) is deliberately never used: the portal owns the billing schedule.
 *
 * What is NEVER read from a reply: the card number, expiry, CVV, citizen id, Track2 or CreditCard_Token. The mappers below
 * pick a short whitelist of fields (ids, mask, amount, status), so those can not leak even if SUMIT returns them.
 * Secrets (API key, public key, the one-time token) are redacted from every error that leaves this module, and nothing here logs.
 */

const DEFAULT_TIMEOUT_MS = 20_000;
const CHARGE_TIMEOUT_MS = 30_000;
const MAX_DETAIL_LENGTH = 200;

/** SUMIT serialises the enums as numbers or names; numeric values are accepted by both common .NET serializers. */
const CUSTOMER_SEARCH_MODE_EXTERNAL_IDENTIFIER = 2;
const CURRENCY_ILS = 0;

export type SumitPayment = {
  id: string;
  customerId: string | null;
  /** SUMIT's explicit Payment.ValidPayment boolean. A missing / non-boolean value is NOT mapped as false: the payment is unreadable (null). */
  valid: boolean;
  status: string | null;
  statusDescription: string | null;
  amountAgorot: number;
  date: string | null;
  cardMask: string | null;
  documentId: string | null;
};

export type SumitPaymentMethod = {
  id: string | null;
  customerId: string | null;
  cardMask: string | null;
};

type Envelope = { Status?: unknown; UserErrorMessage?: unknown; TechnicalErrorDetails?: unknown; Data?: unknown };
type Json = Record<string, unknown>;

function secretsOf(config: SumitConfig, extra: ReadonlyArray<string | null | undefined> = []): string[] {
  return [config.apiKey, config.apiPublicKey, ...extra].filter((value): value is string => typeof value === "string");
}

function classifyStatus(value: unknown): "success" | "business" | "technical" | "unknown" {
  if (value === 0 || value === "0") return "success";
  if (value === 1 || value === "1") return "business";
  if (value === 2 || value === "2") return "technical";
  if (typeof value === "string") {
    if (/^success/i.test(value)) return "success";
    if (/^business/i.test(value)) return "business";
    if (/^technical/i.test(value)) return "technical";
  }
  return "unknown";
}

function plainText(value: unknown, secrets: string[]): string | null {
  if (typeof value !== "string") return null;
  const text = redactSecrets(value.replace(/\s+/g, " ").trim(), secrets).slice(0, MAX_DETAIL_LENGTH);
  return text.length > 0 ? text : null;
}

async function post(config: SumitConfig, path: string, body: Json, options: { timeoutMs?: number; extraSecrets?: string[] } = {}): Promise<Json> {
  const secrets = secretsOf(config, options.extraSecrets);
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ Credentials: { CompanyID: config.companyId, APIKey: config.apiKey }, ...body }),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    throw new PaymentProviderError("network", redactSecrets(`SUMIT request failed (${path}): ${error instanceof Error ? error.message : "unknown"}`, secrets));
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new PaymentProviderError("invalid-response", `SUMIT returned a non-JSON response (${path}, HTTP ${response.status})`);
  }
  if (!json || typeof json !== "object") throw new PaymentProviderError("invalid-response", `SUMIT returned an unexpected reply (${path})`);

  const envelope = json as Envelope;
  const status = classifyStatus(envelope.Status);
  if (status === "success") {
    if (!response.ok) throw new PaymentProviderError("invalid-response", `SUMIT replied Success with HTTP ${response.status} (${path})`);
    return envelope.Data && typeof envelope.Data === "object" ? (envelope.Data as Json) : {};
  }
  if (status === "business") {
    const detail = plainText(envelope.UserErrorMessage, secrets) ?? plainText(envelope.TechnicalErrorDetails, secrets);
    throw new PaymentProviderError("rejected", `SUMIT rejected ${path}${detail ? `: ${detail}` : ""}`, detail);
  }
  if (status === "technical") {
    const detail = plainText(envelope.TechnicalErrorDetails, secrets) ?? plainText(envelope.UserErrorMessage, secrets);
    throw new PaymentProviderError("provider-error", `SUMIT had a technical error on ${path}${detail ? `: ${detail}` : ""}`, detail);
  }
  throw new PaymentProviderError("invalid-response", `SUMIT reply had no readable Status (${path}, HTTP ${response.status})`);
}

function requireConfig(): SumitConfig {
  const config = getSumitConfig();
  if (!config) throw new PaymentProviderError("not-configured", "SUMIT is not configured");
  return config;
}

const DIGITS_ID = /^[0-9]{1,15}$/;

function customerIdToNumber(customerId: string): number {
  if (!DIGITS_ID.test(customerId)) throw new PaymentProviderError("invalid-input", "invalid SUMIT customer id");
  return Number(customerId);
}

function paymentIdToNumber(paymentId: string): number {
  if (!DIGITS_ID.test(paymentId)) throw new PaymentProviderError("invalid-input", "invalid SUMIT payment id");
  return Number(paymentId);
}

function idText(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && DIGITS_ID.test(value)) return value;
  return null;
}

// --- mappers: a short whitelist, nothing sensitive is ever picked up --------------------------------------------------

export function mapSumitPaymentMethod(raw: unknown): SumitPaymentMethod | null {
  if (!raw || typeof raw !== "object") return null;
  const method = raw as Json;
  const lastDigits = typeof method.CreditCard_LastDigits === "string" && /^[0-9]{4}$/.test(method.CreditCard_LastDigits) ? method.CreditCard_LastDigits : null;
  const mask = typeof method.CreditCard_CardMask === "string" && /^[0-9*xX•\- ]{4,32}$/.test(method.CreditCard_CardMask) ? method.CreditCard_CardMask : null;
  return { id: idText(method.ID), customerId: idText(method.CustomerID), cardMask: mask ?? (lastDigits ? `****${lastDigits}` : null) };
}

/**
 * Maps a SUMIT Payment, or returns null when it is NOT cleanly readable. Every field the decision rests on must be present
 * and well-formed: a missing or non-boolean ValidPayment is NOT "false" (that would look like a certain failure) - the caller
 * treats null as an uncertain outcome and throws, with no automatic retry.
 */
export function mapSumitPayment(raw: unknown, secrets: string[] = []): SumitPayment | null {
  if (!raw || typeof raw !== "object") return null;
  const payment = raw as Json;
  const id = idText(payment.ID);
  const amount = payment.Amount;
  if (!id || typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return null;
  if (typeof payment.ValidPayment !== "boolean") return null;
  const customerId = idText(payment.CustomerID);
  if (payment.CustomerID !== null && payment.CustomerID !== undefined && customerId === null) return null;
  const date = typeof payment.Date === "string" && !Number.isNaN(new Date(payment.Date).getTime()) ? new Date(payment.Date).toISOString() : null;
  return {
    id,
    customerId,
    valid: payment.ValidPayment,
    status: plainText(payment.Status, secrets),
    statusDescription: plainText(payment.StatusDescription, secrets),
    amountAgorot: Math.round(amount * 100),
    date,
    cardMask: mapSumitPaymentMethod(payment.PaymentMethod)?.cardMask ?? null,
    documentId: idText(payment.DocumentID),
  };
}

// --- endpoints ----------------------------------------------------------------------------------------------------------

export async function createSumitCustomer(input: { externalId: string; name: string; email?: string | null; phone?: string | null }): Promise<{ customerId: string }> {
  const config = requireConfig();
  const name = input.name.trim();
  const externalId = input.externalId.trim();
  if (!name || !externalId) throw new PaymentProviderError("invalid-input", "a customer needs a name and an external id");

  const data = await post(config, "/accounting/customers/create/", {
    Details: {
      Name: name,
      ExternalIdentifier: externalId,
      SearchMode: CUSTOMER_SEARCH_MODE_EXTERNAL_IDENTIFIER,
      ...(input.email?.trim() ? { EmailAddress: input.email.trim() } : {}),
      ...(input.phone?.trim() ? { Phone: input.phone.trim() } : {}),
    },
  });
  const customerId = idText(data.CustomerID);
  if (!customerId) throw new PaymentProviderError("invalid-response", "SUMIT did not return a customer id");
  return { customerId };
}

export async function setSumitPaymentMethod(input: { customerId: string; singleUseToken: string }): Promise<{ customerId: string; paymentMethod: SumitPaymentMethod }> {
  const config = requireConfig();
  const customerId = customerIdToNumber(input.customerId);
  if (!/^[A-Za-z0-9-]{8,100}$/.test(input.singleUseToken)) throw new PaymentProviderError("invalid-input", "invalid payment token");

  const data = await post(config, "/billing/paymentmethods/setforcustomer/", { Customer: { ID: customerId }, SingleUseToken: input.singleUseToken }, { extraSecrets: [input.singleUseToken] });
  const paymentMethod = mapSumitPaymentMethod(data.PaymentMethod);
  const returnedCustomerId = idText(data.CustomerID);
  if (!paymentMethod || !returnedCustomerId) throw new PaymentProviderError("invalid-response", "SUMIT did not confirm the saved payment method");
  return { customerId: returnedCustomerId, paymentMethod };
}

export async function getSumitPaymentMethod(customerId: string): Promise<SumitPaymentMethod | null> {
  const config = requireConfig();
  const data = await post(config, "/billing/paymentmethods/getforcustomer/", { Customer: { ID: customerIdToNumber(customerId) }, IncludeInactive: false });
  if (data.PaymentMethod === null || data.PaymentMethod === undefined) return null;
  const method = mapSumitPaymentMethod(data.PaymentMethod);
  if (!method) throw new PaymentProviderError("invalid-response", "SUMIT returned an unreadable payment method");
  return method;
}

export async function removeSumitPaymentMethod(customerId: string): Promise<void> {
  const config = requireConfig();
  await post(config, "/billing/paymentmethods/remove/", { Customer: { ID: customerIdToNumber(customerId) } });
}

export type SumitChargeRequest = {
  customerId: string;
  /** Integer agorot; converted to ILS only here, at the edge. */
  amountAgorot: number;
  description: string;
  documentDescription: string;
  vatIncluded: boolean;
  sendDocumentByEmail: boolean;
};

/**
 * Charges the customer's SAVED payment method (no PaymentMethod / token in the request). In a dry run it only authorises.
 *
 * A Success reply is accepted only when its payment is readable AND consistent with what was asked: the same customer (when the
 * reply names one) and the amount. A reply that disagrees is not trusted - it throws invalid-response (outcome UNKNOWN: money
 * may have moved), it is never mapped to success or to failure.
 *   - VAT included (the price already contains VAT): the paid amount must equal the requested amount exactly. An exact match is
 *     evidence that the amount is right (`amountProven: true`).
 *   - VAT not included: SUMIT documents "VATIncluded: Defaults to false" but not how Payment.Amount relates to UnitPrice. A lower
 *     amount is inconsistent and throws; a higher one is only "plausible", so `amountProven` is FALSE and the provider layer never
 *     lets this path return "succeeded" (docs/sumit-verification.md, question 3).
 * `authoriseOnly` is what THIS request asked for, taken from the configuration at the moment of the call.
 */
export async function chargeSumitCustomer(input: SumitChargeRequest): Promise<{ payment: SumitPayment; documentUrl: string | null; authoriseOnly: boolean; amountProven: boolean }> {
  const config = requireConfig();
  const customerId = customerIdToNumber(input.customerId);
  if (!Number.isInteger(input.amountAgorot) || input.amountAgorot <= 0) throw new PaymentProviderError("invalid-input", "invalid charge amount");
  if (!input.description.trim()) throw new PaymentProviderError("invalid-input", "a charge needs a description");

  const data = await post(
    config,
    "/billing/payments/charge/",
    {
      Customer: { ID: customerId },
      Items: [{ Item: { Name: input.description }, Quantity: 1, UnitPrice: input.amountAgorot / 100, Currency: CURRENCY_ILS, Description: input.description }],
      VATIncluded: input.vatIncluded,
      SendDocumentByEmail: input.sendDocumentByEmail,
      DocumentDescription: input.documentDescription,
      ...(config.dryRun ? { AuthoriseOnly: true, DraftDocument: true } : {}),
    },
    { timeoutMs: CHARGE_TIMEOUT_MS },
  );

  const payment = mapSumitPayment(data.Payment, secretsOf(config));
  if (!payment) throw new PaymentProviderError("invalid-response", "SUMIT did not return a readable payment");
  if (payment.customerId !== null && payment.customerId !== String(customerId)) throw new PaymentProviderError("invalid-response", "SUMIT returned a payment of another customer");
  const amountAgrees = input.vatIncluded ? payment.amountAgorot === input.amountAgorot : payment.amountAgorot >= input.amountAgorot;
  if (!amountAgrees) throw new PaymentProviderError("invalid-response", "SUMIT returned a payment whose amount disagrees with the request");
  const rawUrl = typeof data.DocumentDownloadURL === "string" ? data.DocumentDownloadURL : null;
  return { payment, documentUrl: rawUrl && /^https:\/\//i.test(rawUrl) ? rawUrl : null, authoriseOnly: config.dryRun, amountProven: input.vatIncluded };
}

/** A payment by id. A Success reply WITHOUT a readable payment is an error - SUMIT does not document "not found" as an empty Success, so absence is never inferred. */
export async function getSumitPayment(paymentId: string): Promise<SumitPayment> {
  const config = requireConfig();
  const data = await post(config, "/billing/payments/get/", { PaymentID: paymentIdToNumber(paymentId) });
  const payment = mapSumitPayment(data.Payment, secretsOf(config));
  if (!payment) throw new PaymentProviderError("invalid-response", "SUMIT did not return a readable payment");
  if (payment.id !== String(paymentIdToNumber(paymentId))) throw new PaymentProviderError("invalid-response", "SUMIT returned a different payment than requested");
  return payment;
}

export async function listSumitPayments(input: { dateFrom: Date; dateTo: Date; valid?: boolean; startIndex?: number }): Promise<{ payments: SumitPayment[]; hasNextPage: boolean }> {
  const config = requireConfig();
  const data = await post(config, "/billing/payments/list/", {
    Date_From: input.dateFrom.toISOString(),
    Date_To: input.dateTo.toISOString(),
    StartIndex: input.startIndex ?? 0,
    ...(input.valid === undefined ? {} : { Valid: input.valid }),
  });
  // A list is used to RECONCILE ("is there a payment?"), so it must be complete and readable: a malformed list, an unreadable row or an
  // unknown "has next page" would make "no payment found" look certain when it is not. Any of them is an error, never an empty list.
  if (!Array.isArray(data.Payments) || typeof data.HasNextPage !== "boolean") throw new PaymentProviderError("invalid-response", "SUMIT returned an unreadable payments list");
  const payments: SumitPayment[] = [];
  for (const row of data.Payments) {
    const payment = mapSumitPayment(row, secretsOf(config));
    if (!payment) throw new PaymentProviderError("invalid-response", "SUMIT returned an unreadable payment in the list");
    payments.push(payment);
  }
  return { payments, hasNextPage: data.HasNextPage };
}

/**
 * READ-ONLY: the organization's name. Used by the local test lab (scripts/sumit-lab) to attest, at run time, that the configured
 * keys belong to the test organization: SUMIT documents that "בדיקות" is added to a test organization's name. No flow of the
 * app calls this. Nothing but the (trimmed, length-limited) name is read.
 */
export async function getSumitCompanyName(): Promise<{ name: string | null }> {
  const config = requireConfig();
  const data = await post(config, "/website/companies/getdetails/", {});
  const company = data.Company;
  if (!company || typeof company !== "object") throw new PaymentProviderError("invalid-response", "SUMIT did not return the organization details");
  const name = (company as Json).Name;
  return { name: typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : null };
}
