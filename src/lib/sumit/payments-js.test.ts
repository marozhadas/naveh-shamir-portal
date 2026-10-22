import { describe, expect, it, vi } from "vitest";
import { CARD_FIELD_ERROR, normalizeCard, requestToken, tokenFromResponse, type PaymentsJsGlobal, type PaymentsJsSettings } from "./payments-js";

const TOKEN = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
// Cards SUMIT documents for its test terminal (help article 5832877) - a copy for this test only; the lab owns the full list.
const DOCUMENTED_TEST_CARDS = [
  { id: "mc-2", number: "5326107300020772", month: 5, year: 2031, cvv: "033" },
  { id: "mc-3", number: "5310840302789139", month: 5, year: 2031, cvv: "111" },
  { id: "visa-1", number: "4557430402321333", month: 5, year: 2031, cvv: "098" },
  { id: "visa-2", number: "4557430402821341", month: 5, year: 2031, cvv: "998" },
];

function makeForm(initialOgToken: string | null = null) {
  const og = initialOgToken === null ? null : { value: initialOgToken };
  return { og, querySelector: (selector: string) => (selector === "input[name='og-token']" ? og : null) };
}
function makePayments(onCall: (settings: PaymentsJsSettings) => void): PaymentsJsGlobal & { calls: PaymentsJsSettings[] } {
  const calls: PaymentsJsSettings[] = [];
  return { calls, Payments: { CreateToken: (settings) => { calls.push(settings); onCall(settings); return false; } } };
}
const base = (payments: PaymentsJsGlobal | undefined, form = makeForm(), extra: object = {}) => ({ payments, companyId: 123456, apiPublicKey: "public-key-for-tests", form, formSelector: "#card-form", ...extra });

describe("tokenFromResponse", () => {
  it("accepts only Status 0 with a plausible one-time token", () => {
    expect(tokenFromResponse({ Status: 0, Data: { SingleUseToken: TOKEN } })).toBe(TOKEN);
    for (const bad of [null, undefined, "x", 5, {}, { Status: 1, UserErrorMessage: "no", Data: null }, { Status: 2, Data: { SingleUseToken: TOKEN } }, { Status: 0, Data: {} }, { Status: 0, Data: null }, { Status: 0, Data: { SingleUseToken: "short" } }, { Status: 0, Data: { SingleUseToken: 12345678 } }, { Status: 0, Data: { SingleUseToken: "has spaces in it!" } }]) {
      expect(tokenFromResponse(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("never treats a card number as a token", () => {
    expect(tokenFromResponse({ Status: 0, Data: { SingleUseToken: "5326107300020772" } })).toBeNull();
  });
});

describe("requestToken (one attempt, exactly one answer)", () => {
  it("calls CreateToken ONCE with the public settings and the form selector, and resolves with the token", async () => {
    const payments = makePayments((settings) => settings.ResponseCallback({ Status: 0, Data: { SingleUseToken: TOKEN } }));
    const result = await requestToken(base(payments));
    expect(result).toEqual({ status: "ok", token: TOKEN });
    expect(payments.calls).toHaveLength(1);
    expect(payments.calls[0]).toMatchObject({ CompanyID: 123456, APIPublicKey: "public-key-for-tests", FormSelector: "#card-form" });
    expect(Object.keys(payments.calls[0]).sort()).toEqual(["APIPublicKey", "CompanyID", "ErrorsClass", "FormSelector", "ResponseCallback"]);
  });

  it("clears a stale og-token BEFORE the call (a non-empty one makes the script skip the request) and leaves the hidden field empty afterwards", async () => {
    const form = makeForm("stale-token-value");
    let valueDuringCall: string | null = null;
    const payments = makePayments((settings) => {
      valueDuringCall = form.og!.value;
      form.og!.value = TOKEN; // what the script does on success
      settings.ResponseCallback({ Status: 0, Data: { SingleUseToken: TOKEN } });
    });
    await requestToken(base(payments, form));
    expect(valueDuringCall).toBe("");
    expect(form.og!.value).toBe("");
  });

  it("a refusal (Status 1) resolves as 'refused' - the message text is never carried out", async () => {
    const payments = makePayments((settings) => settings.ResponseCallback({ Status: 1, UserErrorMessage: "raw SUMIT text", Data: null }));
    const result = await requestToken(base(payments));
    expect(result).toEqual({ status: "refused" });
    expect(JSON.stringify(result)).not.toContain("raw SUMIT");
  });

  it("when the script never answers (network failure) it resolves 'no-answer' after the timeout, and a late answer is ignored", async () => {
    vi.useFakeTimers();
    try {
      let late: (() => void) | null = null;
      const payments = makePayments((settings) => { late = () => settings.ResponseCallback({ Status: 0, Data: { SingleUseToken: TOKEN } }); });
      const promise = requestToken(base(payments, makeForm(), { timeoutMs: 5000 }));
      await vi.advanceTimersByTimeAsync(4999);
      let settled = false;
      void promise.then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      expect(await promise).toEqual({ status: "no-answer" });
      late!();
      expect(await promise).toEqual({ status: "no-answer" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("resolves exactly once even if the script answers twice", async () => {
    const payments = makePayments((settings) => {
      settings.ResponseCallback({ Status: 0, Data: { SingleUseToken: TOKEN } });
      settings.ResponseCallback({ Status: 1, Data: null });
    });
    expect(await requestToken(base(payments))).toEqual({ status: "ok", token: TOKEN });
  });

  it("missing script, a script without CreateToken, or a script that throws (e.g. no jQuery) -> 'no-answer', never an exception", async () => {
    expect(await requestToken(base(undefined))).toEqual({ status: "no-answer" });
    expect(await requestToken(base({ Payments: {} } as never))).toEqual({ status: "no-answer" });
    const throwing = makePayments(() => { throw new ReferenceError("jQuery is not defined"); });
    expect(await requestToken(base(throwing))).toEqual({ status: "no-answer" });
  });
});

describe("requestToken cancellation (the form was removed)", () => {
  it("an already aborted signal: 'cancelled' and CreateToken is never called", async () => {
    const payments = makePayments((settings) => settings.ResponseCallback({ Status: 0, Data: { SingleUseToken: TOKEN } }));
    const controller = new AbortController();
    controller.abort();
    expect(await requestToken(base(payments, makeForm(), { signal: controller.signal }))).toEqual({ status: "cancelled" });
    expect(payments.calls).toHaveLength(0);
  });

  it("aborting while waiting resolves 'cancelled'; the late answer is ignored and cannot yield a token", async () => {
    let late: (() => void) | null = null;
    const form = makeForm("");
    const payments = makePayments((settings) => { late = () => { form.og!.value = TOKEN; settings.ResponseCallback({ Status: 0, Data: { SingleUseToken: TOKEN } }); }; });
    const controller = new AbortController();
    const promise = requestToken(base(payments, form, { signal: controller.signal }));
    controller.abort();
    expect(await promise).toEqual({ status: "cancelled" });
    late!();
    expect(await promise).toEqual({ status: "cancelled" });
  });

  it("aborting after the answer changes nothing", async () => {
    const payments = makePayments((settings) => settings.ResponseCallback({ Status: 0, Data: { SingleUseToken: TOKEN } }));
    const controller = new AbortController();
    const result = await requestToken(base(payments, makeForm(), { signal: controller.signal }));
    controller.abort();
    expect(result).toEqual({ status: "ok", token: TOKEN });
  });
});

describe("normalizeCard", () => {
  const now = new Date("2026-10-22T10:00:00Z");

  it("every documented SUMIT test card passes (digits only, 4-digit year, 2-digit month)", () => {
    for (const card of DOCUMENTED_TEST_CARDS) {
      const result = normalizeCard({ number: card.number.replace(/(\d{4})/g, "$1 "), month: String(card.month), year: String(card.year), cvv: card.cvv }, now);
      expect(result, card.id).toEqual({ ok: true, card: { number: card.number, month: String(card.month).padStart(2, "0"), year: String(card.year), cvv: card.cvv } });
    }
  });

  it("a 2-digit year becomes a 4-digit year", () => {
    expect(normalizeCard({ number: "5326107300020772", month: "5", year: "31", cvv: "033" }, now)).toMatchObject({ ok: true, card: { month: "05", year: "2031" } });
  });

  it("refuses a wrong number, an impossible or past expiry and a bad CVV - with Hebrew messages, without echoing the values", () => {
    const result = normalizeCard({ number: "5326", month: "13", year: "2020", cvv: "1" }, now);
    expect(result).toEqual({ ok: false, errors: { number: CARD_FIELD_ERROR.number, month: CARD_FIELD_ERROR.expiry, cvv: CARD_FIELD_ERROR.cvv } });
    expect(JSON.stringify(result)).not.toMatch(/5326|2020/);
    expect(normalizeCard({ number: "5326107300020772", month: "09", year: "2026", cvv: "033" }, now)).toMatchObject({ ok: false });
    expect(normalizeCard({ number: "5326107300020772", month: "10", year: "2026", cvv: "033" }, now)).toMatchObject({ ok: true });
    expect(normalizeCard({ number: "abcd", month: "", year: "", cvv: "" }, now)).toMatchObject({ ok: false });
  });
});
