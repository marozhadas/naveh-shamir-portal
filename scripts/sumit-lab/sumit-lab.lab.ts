import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSumitCustomer, getSumitCompanyName, getSumitPayment, getSumitPaymentMethod, listSumitPayments, setSumitPaymentMethod } from "@/lib/sumit/client";
import { SUMIT_BASE_URL, getSumitConfig, getSumitConfigurationProblems, type SumitConfig } from "@/lib/sumit/config";
import { createSumitPaymentProvider } from "@/lib/sumit/sumit-payment-provider";
import { isSumitTestOrganizationName } from "@/lib/sumit/test-organization";
import { getPaymentsProviderId } from "@/lib/payments/get-payment-provider";
import { PaymentProviderError } from "@/domain/payments/payment-provider";
import {
  CARD_A,
  CARD_B,
  DATA_CHANGING_STEPS,
  DOCUMENTED_TEST_CARDS,
  approvedSteps,
  currentSecrets,
  diffPayments,
  installRecorder,
  last4,
  latestAttemptTime,
  loadLabEnv,
  maxCalls,
  redact,
  report,
  writeOutput,
  type TestCard,
} from "./lab-support";

/**
 * LOCAL SUMIT TEST LAB - run with `npm run sumit:lab` (see README.md). Not part of `npm test`, not part of any build.
 *
 *   always            preflight (offline) and identity (read-only: it only READS the organization's name and quotas)
 *   only if approved  the data-changing steps, one by one, by name in SUMIT_LAB_APPROVED, and only after identity PASSED
 *
 * A successful run proves what it observed in the test organization, nothing more: one good result does not prove that a
 * BusinessError or ValidPayment=false guarantees that nothing was charged. The app's conservative handling stays as it is.
 */

const loadedNames = loadLabEnv();
const approved = approvedSteps();
const recorder = installRecorder(maxCalls());
const runId = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const LAB_CUSTOMER_EXTERNAL_ID = "lab-customer-1";
const originalDryRun = process.env.SUMIT_DRY_RUN;

const state: { config: SumitConfig | null; preflightOk: boolean; identityOk: boolean; customerId: string | null; capturedPayment: Record<string, unknown> | null } = {
  config: null,
  preflightOk: false,
  identityOk: false,
  customerId: process.env.SUMIT_LAB_CUSTOMER_ID && /^[0-9]{1,15}$/.test(process.env.SUMIT_LAB_CUSTOMER_ID) ? process.env.SUMIT_LAB_CUSTOMER_ID : null,
  capturedPayment: null,
};
const summaries: Record<string, unknown> = {};

function ready(step: string): boolean {
  if (!approved.has(step)) return false;
  if (!state.identityOk) {
    report(step, { skipped: "the test organization was not attested (identity must PASS first)" });
    return false;
  }
  return true;
}

/** Extracts the raw (redacted) Payment object of the last charge/get response, to compare what SUMIT really returned. */
function rawPayment(apiPath: string): Record<string, unknown> | null {
  const response = recorder.lastResponse(apiPath) as { Data?: { Payment?: Record<string, unknown> } } | null;
  return response?.Data?.Payment ?? null;
}

async function tokenizeTestCard(card: TestCard): Promise<string> {
  if (!DOCUMENTED_TEST_CARDS.some((documented) => documented.number === card.number)) throw new Error("only the cards SUMIT documents as test cards may be tokenized by the lab");
  const config = state.config;
  if (!config) throw new Error("not configured");
  // The same call payments.js makes in the browser (public key only), done here with a documented TEST card.
  const response = await fetch(`${SUMIT_BASE_URL}/creditguy/vault/tokenizesingleusejson/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ Credentials: { CompanyID: config.companyId, APIPublicKey: config.apiPublicKey }, CardNumber: card.number, ExpirationMonth: card.month, ExpirationYear: card.year, CVV: card.cvv }),
  });
  const body = (await response.json()) as { Status?: unknown; Data?: { SingleUseToken?: unknown } };
  const token = body?.Data?.SingleUseToken;
  if (typeof token !== "string" || token.length < 8) throw new Error(`tokenization did not return a token (HTTP ${response.status}, Status ${String(body?.Status)})`);
  return token;
}

/** A call the app's client refuses to make (e.g. a null token), sent raw so SUMIT's own answer can be observed. */
async function rawPost(apiPath: "/billing/paymentmethods/setforcustomer/" | "/billing/paymentmethods/getforcustomer/" | "/website/companies/listquotas/", body: Record<string, unknown>): Promise<{ httpStatus: number; envelope: { Status?: unknown; UserErrorMessage?: unknown; Data?: unknown } }> {
  const config = state.config;
  if (!config) throw new Error("not configured");
  const response = await fetch(`${SUMIT_BASE_URL}${apiPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ Credentials: { CompanyID: config.companyId, APIKey: config.apiKey }, ...body }),
  });
  return { httpStatus: response.status, envelope: await response.json() };
}

beforeAll(() => {
  recorder.setStep("preflight");
});

afterAll(() => {
  if (originalDryRun === undefined) delete process.env.SUMIT_DRY_RUN;
  else process.env.SUMIT_DRY_RUN = originalDryRun;
  const file = writeOutput("run", { runId, approved: [...approved], callsUsed: recorder.calls(), summaries, exchanges: recorder.exchanges });
  report("run finished", { callsUsed: recorder.calls(), callBudget: maxCalls(), redactedRecordingWrittenTo: file.replace(/^.*scripts[\\/]/, "scripts/") });
  recorder.restore();
});

describe("1. preflight (offline - no request is sent)", () => {
  it("lists what is missing and refuses to continue unless the configuration is the approved TEST organization", () => {
    let providerSelection = "ok";
    try {
      getPaymentsProviderId();
    } catch (error) {
      providerSelection = error instanceof Error ? error.message : "invalid";
    }
    const problems = getSumitConfigurationProblems();
    state.config = getSumitConfig();
    state.preflightOk = providerSelection === "ok" && problems.length === 0 && state.config?.environment === "test";

    report("preflight", {
      envFileVariablesLoaded: loadedNames,
      PAYMENTS_PROVIDER: providerSelection === "ok" ? "sumit" : providerSelection,
      sumitConfigurationProblems: problems.map((entry) => `${entry.variable}: ${entry.problem}`),
      environmentIsTest: state.config?.environment === "test",
      dryRunNow: state.config?.dryRun ?? null,
      approvedSteps: [...approved],
      unknownApprovedSteps: [...approved].filter((name) => !(DATA_CHANGING_STEPS as readonly string[]).includes(name)),
      dataChangingStepsAvailable: DATA_CHANGING_STEPS,
      callBudget: maxCalls(),
      secretsPrinted: false,
    });
    summaries.preflight = { ready: state.preflightOk, problems: problems.map((entry) => entry.variable) };
    expect(providerSelection, "PAYMENTS_PROVIDER must be 'sumit'").toBe("ok");
    expect(problems.map((entry) => `${entry.variable}: ${entry.problem}`)).toEqual([]);
    expect(state.config?.environment).toBe("test");
  });
});

describe("2. identity (read-only): do the configured keys belong to the TEST organization?", () => {
  it("reads only the organization's NAME and quotas; passes only if SUMIT's documented test marker is present", async (context) => {
    if (!state.preflightOk) {
      report("identity", { skipped: "preflight is not ready" });
      context.skip();
      return;
    }
    recorder.setStep("identity");
    const { name } = await getSumitCompanyName();
    const quotas = await rawPost("/website/companies/listquotas/", {});
    state.identityOk = isSumitTestOrganizationName(name);
    summaries.identity = { pass: state.identityOk };
    report("identity", {
      configuredCompanyIdEqualsApprovedTestCompanyId: true, // guaranteed by the configuration guard (preflight)
      nameCarriesTheDocumentedTestMarker: state.identityOk,
      organizationNameLength: name?.length ?? 0,
      quotasHttpStatus: quotas.httpStatus,
      quotasStatus: String(quotas.envelope?.Status),
      result: state.identityOk ? "PASS - this is the test organization" : "FAIL - do NOT approve any step",
    });
    expect(state.identityOk).toBe(true);
  });
});

describe("3. data-changing steps (each needs SUMIT_LAB_APPROVED=<name> and a passed identity check)", () => {
  it.skipIf(!approved.has("save-card"))("save-card: tokenize a documented test card, save it, check the returned ids and the last four digits", async () => {
    if (!ready("save-card")) return;
    recorder.setStep("save-card");
    const token = await tokenizeTestCard(CARD_A);
    const { customerId } = await createSumitCustomer({ externalId: LAB_CUSTOMER_EXTERNAL_ID, name: "Lab customer (test)" });
    const saved = await setSumitPaymentMethod({ customerId, singleUseToken: token });
    const read = await getSumitPaymentMethod(customerId);
    state.customerId = customerId;
    const summary = {
      customerId,
      returnedCustomerIdMatches: saved.customerId === customerId,
      paymentMethodId: saved.paymentMethod.id, // may be null - documented as possible
      savedMaskLast4: last4(saved.paymentMethod.cardMask),
      readBackMaskLast4: last4(read?.cardMask),
      expectedLast4: last4(CARD_A.number),
      lastFourMatch: last4(saved.paymentMethod.cardMask) === last4(CARD_A.number) && last4(read?.cardMask) === last4(CARD_A.number),
      compareInSumitUi: "the customer card must show an ACTIVE card ending in " + last4(CARD_A.number),
    };
    summaries["save-card"] = summary;
    report("save-card", summary);
    expect(summary.lastFourMatch).toBe(true);
  });

  it.skipIf(!approved.has("null-token"))("null-token: what does SUMIT answer to setforcustomer with a null SingleUseToken? (support: an error)", async () => {
    if (!ready("null-token") || !state.customerId) return;
    recorder.setStep("null-token");
    const { httpStatus, envelope } = await rawPost("/billing/paymentmethods/setforcustomer/", { Customer: { ID: Number(state.customerId) }, SingleUseToken: null });
    const summary = { httpStatus, status: String(envelope.Status), userMessage: typeof envelope.UserErrorMessage === "string" ? envelope.UserErrorMessage.slice(0, 160) : null, answeredWithAnErrorAsSupportSaid: String(envelope.Status) !== "0" && envelope.Status !== "Success" };
    summaries["null-token"] = summary;
    report("null-token", summary);
  });

  it.skipIf(!approved.has("replace-card"))("replace-card: a NEW token on a customer that has a card makes the new card the active one", async () => {
    if (!ready("replace-card")) return;
    if (!state.customerId) {
      report("replace-card", { skipped: "no customer id: run save-card first, or set SUMIT_LAB_CUSTOMER_ID to the lab customer's id" });
      return;
    }
    const customerId = state.customerId;
    recorder.setStep("replace-card");
    const before = await getSumitPaymentMethod(customerId); // what is active BEFORE the replacement
    const token = await tokenizeTestCard(CARD_B);
    const saved = await setSumitPaymentMethod({ customerId, singleUseToken: token });
    const read = await getSumitPaymentMethod(customerId);
    const withInactive = await rawPost("/billing/paymentmethods/getforcustomer/", { Customer: { ID: Number(customerId) }, IncludeInactive: true });
    const data = withInactive.envelope.Data as { PaymentMethod?: { CreditCard_CardMask?: string }; InactivePaymentMethods?: Array<{ CreditCard_CardMask?: string }> } | undefined;
    const summary = {
      customerId,
      customerIdUnchanged: saved.customerId === customerId,
      activeBeforeLast4: last4(before?.cardMask),
      expectedBeforeLast4: last4(CARD_A.number),
      paymentMethodIdBefore: before?.id ?? null,
      paymentMethodIdAfterSave: saved.paymentMethod.id,
      paymentMethodIdReadBack: read?.id ?? null,
      // reported as observed - nothing assumes the id must (or must not) change
      paymentMethodIdChanged: (before?.id ?? null) !== (read?.id ?? null),
      savedMaskLast4: last4(saved.paymentMethod.cardMask),
      activeAfterLast4: last4(read?.cardMask),
      expectedLast4: last4(CARD_B.number),
      newCardIsActive: last4(read?.cardMask) === last4(CARD_B.number),
      inactiveCardsLast4: (data?.InactivePaymentMethods ?? []).map((method) => last4(method.CreditCard_CardMask)),
      compareInSumitUi: "the customer card must show an ACTIVE card ending in " + last4(CARD_B.number),
    };
    summaries["replace-card"] = summary;
    report("replace-card", summary);
    expect(summary.customerIdUnchanged).toBe(true);
    expect(summary.newCardIsActive).toBe(true);
  });

  it.skipIf(!approved.has("charge-saved"))("charge-saved: ONE VAT-included 39 NIS test charge of the SAVED card (no card data sent), then a read-back; compare, never retry", async () => {
    if (!ready("charge-saved")) return;
    if (!state.customerId) {
      report("charge-saved", { skipped: "no customer id: set SUMIT_LAB_CUSTOMER_ID to the lab customer's id (or run save-card first)" });
      return;
    }
    // --- guards, BEFORE any charge request ---------------------------------------------------------------------------------
    const config = state.config;
    const guards = {
      environmentIsTest: config?.environment === "test",
      productionUnlockNotSet: process.env.SUMIT_ALLOW_PRODUCTION === undefined,
      configuredOrganizationIsApprovedTestOrganization: getSumitConfigurationProblems().length === 0,
      identityAttestedInThisRun: state.identityOk,
    };
    recorder.setStep("charge-saved");
    const active = await getSumitPaymentMethod(state.customerId);
    const activeLast4 = last4(active?.cardMask);
    const expectedLast4 = last4(CARD_B.number);
    const guardsOk = Object.values(guards).every(Boolean) && activeLast4 === expectedLast4;
    if (!guardsOk) {
      report("charge-saved", { aborted: "a guard failed - NO charge request was sent", guards, activeCardLast4: activeLast4, expectedCardLast4: expectedLast4 });
      expect(guardsOk).toBe(true);
      return;
    }

    // --- the single charge request (the app's own provider; real charge on the TEST terminal, not AuthoriseOnly) --------------
    process.env.SUMIT_DRY_RUN = "false"; // in-process only, for this step; nothing persistent is changed
    const provider = createSumitPaymentProvider();
    let result;
    try {
      result = await provider.charge({ customerId: state.customerId, amountAgorot: 3900, description: "Lab charge - Plus 39", uniqueKey: `lab:charge-saved:${runId}`, vatIncluded: true, sendDocumentByEmail: false });
    } catch (error) {
      // an uncertain outcome: STOP. No retry, no reconciliation call, nothing else is sent.
      const outcome = { outcome: "UNCERTAIN - stopped, exactly one charge request was sent", errorKind: error instanceof PaymentProviderError ? error.kind : "unknown", detail: error instanceof PaymentProviderError ? error.detail : null, chargeRequestsSent: recorder.exchanges.filter((entry) => entry.path === "/billing/payments/charge/").length };
      summaries["charge-saved"] = outcome;
      report("charge-saved", outcome);
      expect.fail("the charge outcome is uncertain; stopped without any retry");
    }

    const chargeRaw = rawPayment("/billing/payments/charge/");
    const chargeData = (recorder.lastResponse("/billing/payments/charge/") as { Data?: Record<string, unknown> } | null)?.Data ?? {};
    state.capturedPayment = chargeRaw;

    // --- ONE read-back (documented: a read-back can never be 'succeeded') -------------------------------------------------------
    let readBackStatus: string | null = null;
    let getRaw: Record<string, unknown> | null = null;
    let readBackError: string | null = null;
    try {
      readBackStatus = (await provider.getPayment(result.paymentId)).status;
      getRaw = rawPayment("/billing/payments/get/");
    } catch (error) {
      readBackError = error instanceof PaymentProviderError ? error.kind : "unknown";
    }
    const same = (key: string) => (chargeRaw && getRaw ? JSON.stringify(chargeRaw[key]) === JSON.stringify(getRaw[key]) : null);

    const summary = {
      guards,
      activeCardLast4Charged: activeLast4,
      chargeRequestsSent: recorder.exchanges.filter((entry) => entry.path === "/billing/payments/charge/").length,
      appStatus: result.status,
      appMode: result.mode,
      requestedAmountNis: 39,
      vatIncludedRequested: true,
      // as SUMIT answered (raw, redacted copy of the charge response)
      rawStatus: chargeRaw?.Status,
      rawStatusDescription: chargeRaw?.StatusDescription,
      rawValidPayment: chargeRaw?.ValidPayment,
      rawPaymentId: chargeRaw?.ID,
      rawAmount: chargeRaw?.Amount,
      rawCurrency: chargeRaw?.Currency,
      // documents: what the charge response itself carries (the document TYPE is not in it)
      documentIdInPayment: chargeRaw?.DocumentID ?? null,
      documentIdInData: chargeData.DocumentID ?? null,
      documentNumber: chargeData.DocumentNumber ?? null,
      documentLinkReturned: Boolean(result.documentUrl),
      documentTypeVerifiedByApi: false,
      // the read-back versus the charge answer
      readBackStatusInApp: readBackStatus, // never 'succeeded' for a read-back
      readBackError,
      readBackSameId: same("ID"),
      readBackSameAmount: same("Amount"),
      readBackSameCurrency: same("Currency"),
      readBackSameValidPayment: same("ValidPayment"),
      readBackSameStatus: same("Status"),
      readBackSameStatusDescription: same("StatusDescription"),
      readBackSameDocumentId: same("DocumentID"),
      fieldDiffChargeVsGet: diffPayments(chargeRaw, getRaw),
      verification: "observed in ONE run; a field is 'verified' only where it was read from SUMIT's own answer - nothing here is inferred",
      compareInSumitUi: "payment " + result.paymentId + ": test-terminal mark, amount 39, currency, VAT line, and the document type",
    };
    summaries["charge-saved"] = summary;
    report("charge-saved", summary);
    expect(result.status).toBe("succeeded");
    expect(readBackStatus).toBe("unconfirmed");
  });

  it.skipIf(!approved.has("charge-vat-false"))("charge-vat-false: VATIncluded=false - what amount does SUMIT charge? (our provider must answer 'unconfirmed')", async () => {
    if (!ready("charge-vat-false") || !state.customerId) return;
    recorder.setStep("charge-vat-false");
    process.env.SUMIT_DRY_RUN = "false";
    const provider = createSumitPaymentProvider();
    const result = await provider.charge({ customerId: state.customerId, amountAgorot: 3900, description: "Lab charge - Plus 39 (VAT not included)", uniqueKey: `lab:charge-vat-false:${runId}`, vatIncluded: false, sendDocumentByEmail: false });
    const raw = rawPayment("/billing/payments/charge/");
    const summary = { appStatus: result.status, appReason: result.unconfirmedReason, rawAmount: raw?.Amount, rawCurrency: raw?.Currency, requestedUnitPrice: 39, compareInSumitUi: "the document: price, VAT and total" };
    summaries["charge-vat-false"] = summary;
    report("charge-vat-false", summary);
    expect(result.status).toBe("unconfirmed");
  });

  it.skipIf(!approved.has("authorise-only"))("authorise-only: AuthoriseOnly charge, then get and list - which fields tell it apart from a captured charge?", async () => {
    if (!ready("authorise-only") || !state.customerId) return;
    recorder.setStep("authorise-only");
    delete process.env.SUMIT_DRY_RUN; // the default: authorise-only + draft document
    const provider = createSumitPaymentProvider();
    const result = await provider.charge({ customerId: state.customerId, amountAgorot: 3900, description: "Lab authorise-only 39", uniqueKey: `lab:authorise-only:${runId}`, vatIncluded: true, sendDocumentByEmail: false });
    const chargeRaw = rawPayment("/billing/payments/charge/");
    const readBack = await provider.getPayment(result.paymentId);
    const getRaw = rawPayment("/billing/payments/get/");
    const list = await listSumitPayments({ dateFrom: new Date(Date.now() - 24 * 3600_000), dateTo: new Date(Date.now() + 3600_000) });
    const summary = {
      appStatus: result.status,
      appMode: result.mode,
      readBackStatus: readBack.status,
      inList: list.payments.some((payment) => payment.id === result.paymentId),
      chargeVersusGetFieldDiff: diffPayments(chargeRaw, getRaw),
      authoriseVersusCapturedFieldDiff: diffPayments(chargeRaw, state.capturedPayment),
      note: "differences are observations from ONE run; they do not prove a field distinguishes authorise-only from capture",
      compareInSumitUi: "the payment and its DRAFT document; is any hold visible on the card record?",
    };
    summaries["authorise-only"] = summary;
    report("authorise-only", summary);
    expect(result.status).toBe("authorised");
  });

  it.skipIf(!approved.has("no-method"))("no-method: charge a customer that has NO saved card - a documented misuse, to observe the envelope (not a bank decline)", async () => {
    if (!ready("no-method")) return;
    recorder.setStep("no-method");
    process.env.SUMIT_DRY_RUN = "false";
    const { customerId } = await createSumitCustomer({ externalId: `lab-no-card-${runId}`, name: "Lab customer without card (test)" });
    const provider = createSumitPaymentProvider();
    let observed: Record<string, unknown>;
    try {
      const result = await provider.charge({ customerId, amountAgorot: 3900, description: "Lab no-method 39", uniqueKey: `lab:no-method:${runId}`, vatIncluded: true, sendDocumentByEmail: false });
      observed = { threw: false, status: result.status, reason: result.unconfirmedReason, providerText: result.providerStatusText };
    } catch (error) {
      observed = { threw: true, kind: error instanceof PaymentProviderError ? error.kind : "unknown", detail: error instanceof PaymentProviderError ? error.detail : null };
    }
    summaries["no-method"] = observed;
    report("no-method", observed);
  });

  it("decline: BLOCKED - SUMIT documents no declining test card or amount, so no card number is guessed", () => {
    const summary = { status: "blocked", reason: "the official test-card list only says the fictitious cards pass a validity check; support does not know a decline scenario", nextAction: "ask SUMIT for a documented decline card/amount for the test terminal" };
    summaries.decline = summary;
    report("decline", summary);
    expect(approved.has("decline")).toBe(false);
  });
});

describe("4. reconcile (READ-ONLY: payments/list and payments/get only - never a charge, never a change)", () => {
  it.skipIf(process.env.SUMIT_LAB_READONLY !== "reconcile")("reconcile: is there a payment of the lab customer that matches the charge-saved attempt? Absence in the list is NOT proof that nothing happened", async (context) => {
    if (!state.identityOk || !state.customerId) {
      report("reconcile", { skipped: "needs a passed identity check and the lab customer id (SUMIT_LAB_CUSTOMER_ID)" });
      context.skip();
      return;
    }
    recorder.setStep("reconcile");
    const attempt = latestAttemptTime("charge-saved");
    if (!attempt) {
      report("reconcile", { skipped: "no earlier recording of a charge-saved attempt to reconcile" });
      context.skip();
      return;
    }
    const SIX_HOURS = 6 * 3600_000;
    const dateFrom = new Date(attempt.getTime() - SIX_HOURS);
    const dateTo = new Date(attempt.getTime() + SIX_HOURS);
    const expectedAgorot = 3900;

    // a bounded read of the list (a few pages at most); reading more pages is NOT a retry of anything
    const payments: Awaited<ReturnType<typeof listSumitPayments>>["payments"] = [];
    let pagesRead = 0;
    let moreAvailable = false;
    for (let startIndex = 0; pagesRead < 5; pagesRead += 1) {
      const page = await listSumitPayments({ dateFrom, dateTo, startIndex });
      payments.push(...page.payments);
      moreAvailable = page.hasNextPage;
      if (!page.hasNextPage || page.payments.length === 0) break;
      startIndex += page.payments.length;
    }
    pagesRead += 1;

    const brief = (payment: (typeof payments)[number]) => ({ id: payment.id, valid: payment.valid, amountAgorot: payment.amountAgorot, date: payment.date, customerId: payment.customerId, status: payment.status, documentId: payment.documentId });
    const forCustomer = payments.filter((payment) => payment.customerId === state.customerId);
    const customerAndAmount = forCustomer.filter((payment) => payment.amountAgorot === expectedAgorot);
    const nearAttempt = customerAndAmount.filter((payment) => payment.date !== null && Math.abs(new Date(payment.date).getTime() - attempt.getTime()) <= 30 * 60_000);

    // one read-back per matching payment (at most 3), only when a candidate exists
    const readBacks: Array<Record<string, unknown>> = [];
    for (const candidate of customerAndAmount.slice(0, 3)) {
      const read = await getSumitPayment(candidate.id);
      const getRaw = rawPayment("/billing/payments/get/");
      readBacks.push({ ...brief(read), rawCurrency: getRaw?.Currency, rawStatusDescription: getRaw?.StatusDescription, rawValidPayment: getRaw?.ValidPayment });
    }

    const summary = {
      attemptStartedUtc: attempt.toISOString(),
      windowFromUtc: dateFrom.toISOString(),
      windowToUtc: dateTo.toISOString(),
      pagesRead,
      moreAvailableAfterLastPage: moreAvailable,
      paymentsInWindow: payments.length,
      paymentsOfTheLabCustomer: forCustomer.map(brief),
      matchCustomerAndAmount: customerAndAmount.map(brief),
      matchCustomerAmountAndTimeWithin30Minutes: nearAttempt.map(brief),
      readBacks,
      conclusion: customerAndAmount.length > 0
        ? "A payment of the lab customer for the expected amount EXISTS in SUMIT: the charge request that SUMIT answered with an error may have been processed. Reconcile before anything else."
        : "NOT FOUND in the list. This does NOT prove that nothing was charged (the list's date semantics and completeness are not documented); it is one piece of evidence only.",
    };
    summaries.reconcile = summary;
    report("reconcile", summary);
    expect(recorder.exchanges.filter((entry) => entry.path === "/billing/payments/charge/")).toEqual([]);
  });
});

describe("secrets never reach the output", () => {
  it("the recorded exchanges contain no key, card number, CVV or token", () => {
    const text = JSON.stringify(redact(recorder.exchanges));
    for (const secret of currentSecrets()) expect(text).not.toContain(secret);
    for (const card of DOCUMENTED_TEST_CARDS) expect(text).not.toContain(card.number);
    expect(text).not.toMatch(/"CVV":"(?!<redacted>)/);
  });
});
