/**
 * The browser side of SUMIT's payments.js - the small, testable part of the card form (no React, no server code, no secrets).
 *
 * What was OBSERVED about payments.js (https://app.sumit.co.il/scripts/payments.js, read and run against the test organization;
 * scripts/sumit-lab/payments-js-prototype):
 *   - it REQUIRES jQuery: without it every call throws "ReferenceError: jQuery is not defined";
 *   - OfficeGuy.Payments.CreateToken(settings) reads the card from inputs marked data-og="cardnumber|expirationmonth|expirationyear|cvv"
 *     in the form named by settings.FormSelector, blanks the `name` of those inputs (so a native submit never carries the card),
 *     posts them straight to api.sumit.co.il and hands the answer to settings.ResponseCallback (the help page does not mention
 *     this callback; it exists in the script). A success is { Status: 0, Data: { SingleUseToken } } - a 36-character uuid; a refusal
 *     (e.g. an empty card number) is HTTP 200 with { Status: 1, UserErrorMessage };
 *   - it has NO in-flight guard: two calls in a row send two requests and create two tokens;
 *   - if a hidden input name="og-token" already holds a value, CreateToken returns true WITHOUT sending anything (and without calling
 *     the callback) - so the value must be cleared before every attempt;
 *   - if the request cannot be sent at all (network, DNS), the callback is NEVER called - the caller needs its own timeout;
 *   - an expired documented test card still tokenizes: the token step does not validate the card.
 *
 * So the form calls CreateToken itself (never BindFormSubmit: a native submit is never wanted), under its own lock and timeout, and
 * never shows SUMIT's own message text.
 */

export const PAYMENTS_JS_URL = "https://app.sumit.co.il/scripts/payments.js";
export const TOKEN_TIMEOUT_MS = 20_000;

export type PaymentsJsSettings = {
  CompanyID: number;
  APIPublicKey: string;
  FormSelector: string;
  ErrorsClass?: string;
  ResponseCallback: (response: unknown) => void;
};
export type PaymentsJsGlobal = { Payments: { CreateToken: (settings: PaymentsJsSettings) => unknown } };

export type TokenAttempt =
  | { status: "ok"; token: string }
  /** SUMIT answered, but not with a token (e.g. the card details were refused). */
  | { status: "refused" }
  /** No answer within the timeout, or the script is unavailable / threw: nothing is known about the card. */
  | { status: "no-answer" }
  /** The caller gave up (the form was removed) before an answer: whatever arrives later is ignored and must not start anything. */
  | { status: "cancelled" };

/** The one-time token out of a payments.js answer, or null. A card-number-looking string is never accepted as a token. */
export function tokenFromResponse(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const body = response as { Status?: unknown; Data?: { SingleUseToken?: unknown } | null };
  if (body.Status !== 0) return null;
  const token = body.Data?.SingleUseToken;
  return typeof token === "string" && /^[A-Za-z0-9-]{8,100}$/.test(token) && !/^\d{12,19}$/.test(token) ? token : null;
}

/**
 * One tokenization attempt: clears a stale og-token first, calls CreateToken once, and resolves exactly once - with the token, a
 * refusal, "no-answer" after the timeout (the script gives no callback on a network failure) or "cancelled" when the caller's signal
 * aborts. A late answer after the timeout or the cancellation is ignored. Never throws. Nothing here logs or stores the token or the card.
 */
export function requestToken(options: {
  payments: PaymentsJsGlobal | undefined;
  companyId: number;
  apiPublicKey: string;
  form: { querySelector: (selector: string) => { value: string } | null };
  formSelector: string;
  timeoutMs?: number;
  /** Aborted when the form goes away: the attempt ends as "cancelled" and a late answer is ignored. */
  signal?: AbortSignal;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}): Promise<TokenAttempt> {
  const { payments, companyId, apiPublicKey, form, formSelector } = options;
  const setTimer = options.setTimer ?? ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  if (options.signal?.aborted) return Promise.resolve({ status: "cancelled" });
  if (!payments?.Payments || typeof payments.Payments.CreateToken !== "function") return Promise.resolve({ status: "no-answer" });

  // a value left in the hidden field makes CreateToken skip the request silently
  const stale = form.querySelector("input[name='og-token']");
  if (stale) stale.value = "";

  return new Promise<TokenAttempt>((resolve) => {
    let settled = false;
    let timer: unknown = null;
    const onAbort = () => finish({ status: "cancelled" });
    const finish = (attempt: TokenAttempt) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimer(timer);
      options.signal?.removeEventListener("abort", onAbort);
      // the hidden field must not keep the token
      const field = form.querySelector("input[name='og-token']");
      if (field) field.value = "";
      resolve(attempt);
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimer(() => finish({ status: "no-answer" }), options.timeoutMs ?? TOKEN_TIMEOUT_MS);
    try {
      payments.Payments.CreateToken({
        CompanyID: companyId,
        APIPublicKey: apiPublicKey,
        FormSelector: formSelector,
        ErrorsClass: ".sumit-unused-errors",
        ResponseCallback: (response) => {
          const token = tokenFromResponse(response);
          finish(token ? { status: "ok", token } : { status: "refused" });
        },
      });
    } catch {
      finish({ status: "no-answer" });
    }
  });
}

// --- the card fields, checked in the browser before anything is sent --------------------------------------------------------

export type CardInput = { number: string; month: string; year: string; cvv: string };
export type CardFieldErrors = Partial<Record<keyof CardInput, string>>;
export const CARD_FIELD_ERROR = {
  number: "יש להזין מספר כרטיס תקין",
  expiry: "יש להזין תוקף תקין (חודש ושנה)",
  cvv: "יש להזין CVV תקין",
} as const;

/** Normalizes what was typed (digits only, 4-digit year) and checks the SHAPE only (no Luhn check: SUMIT is the validator, and not every documented test card passes Luhn). The numbers are returned only to be put back into the fields payments.js reads. */
export function normalizeCard(input: CardInput, now: Date = new Date()): { ok: true; card: CardInput } | { ok: false; errors: CardFieldErrors } {
  const errors: CardFieldErrors = {};
  const number = input.number.replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(number)) errors.number = CARD_FIELD_ERROR.number;

  const month = input.month.trim();
  const yearText = input.year.trim();
  const monthNumber = /^\d{1,2}$/.test(month) ? Number(month) : NaN;
  const yearNumber = /^\d{2}$/.test(yearText) ? 2000 + Number(yearText) : /^\d{4}$/.test(yearText) ? Number(yearText) : NaN;
  if (!(monthNumber >= 1 && monthNumber <= 12) || !Number.isInteger(yearNumber)) errors.month = CARD_FIELD_ERROR.expiry;
  else if (yearNumber < now.getFullYear() || (yearNumber === now.getFullYear() && monthNumber < now.getMonth() + 1)) errors.month = CARD_FIELD_ERROR.expiry;

  const cvv = input.cvv.trim();
  if (!/^\d{3,4}$/.test(cvv)) errors.cvv = CARD_FIELD_ERROR.cvv;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, card: { number, month: String(monthNumber).padStart(2, "0"), year: String(yearNumber), cvv } };
}
