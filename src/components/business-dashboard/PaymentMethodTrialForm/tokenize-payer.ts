/**
 * The payer details PayMe's Hosted Fields SDK checks BEFORE it sends anything (names, email, phone), and how its failures are
 * shown. PayMe's tokenize() REJECTS (it does not resolve) when one of them is empty or malformed, so this module
 *  - validates the four fields in the browser first, with Hebrew messages next to the fields;
 *  - normalizes the phone only in the value handed to the SDK (the field keeps showing what the user typed);
 *  - turns any rejection / error result into a friendly Hebrew message - never PayMe's raw English text or a raw payload;
 *  - keeps "communication failure" for real network / server failures only.
 * Pure (no I/O, no secrets). Nothing here ever reads or returns card data or the token except to hand the token back to the caller.
 */

export type PayerInput = { firstName: string; lastName: string; email: string; phone: string };
export type PayerField = keyof PayerInput;
export type PayerFieldErrors = Partial<Record<PayerField, string>>;

export const PAYER_ERROR = {
  name: "יש למלא שם פרטי ושם משפחה",
  email: "יש להזין כתובת אימייל תקינה",
  phone: "יש להזין מספר טלפון תקין",
} as const;

export const CARD_ERROR_MESSAGE = "פרטי הכרטיס אינם תקינים. בדקו את מספר הכרטיס, התוקף וה-CVV ונסו שוב.";
export const UNKNOWN_PAYMENT_ERROR_MESSAGE = "לא הצלחנו לאמת את פרטי התשלום. בדקו את הפרטים ונסו שוב.";
/** Only for a real communication / server failure. */
export const COMMUNICATION_ERROR_MESSAGE = "אירעה תקלה בתקשורת. לא בוצע חיוב. נסו שוב.";

/** Removes spaces, hyphens, dots and parentheses. A number that is already plain digits (or +digits) is returned unchanged. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-.()]/g, "");
}

/** An Israeli number after normalization: 0 + area/mobile prefix + 7-8 digits, or the same in +972 / 972 form. Matches what PayMe accepts (digits, optional +country code). */
export function isValidIsraeliPhone(normalized: string): boolean {
  return /^(0|\+?972)[2-9]\d{7,8}$/.test(normalized);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function validatePayer(payer: PayerInput): PayerFieldErrors {
  const errors: PayerFieldErrors = {};
  if (!payer.firstName.trim()) errors.firstName = PAYER_ERROR.name;
  if (!payer.lastName.trim()) errors.lastName = PAYER_ERROR.name;
  if (!isValidEmail(payer.email.trim())) errors.email = PAYER_ERROR.email;
  if (!isValidIsraeliPhone(normalizePhone(payer.phone.trim()))) errors.phone = PAYER_ERROR.phone;
  return errors;
}

/** What the SDK is given: trimmed names / email and the normalized phone (never the raw typed phone). */
export function toSdkPayer(payer: PayerInput): { payerFirstName: string; payerLastName: string; payerEmail: string; payerPhone: string } {
  return {
    payerFirstName: payer.firstName.trim(),
    payerLastName: payer.lastName.trim(),
    payerEmail: payer.email.trim(),
    payerPhone: normalizePhone(payer.phone.trim()),
  };
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value && typeof (value as { message: unknown }).message === "string") return (value as { message: string }).message;
  return "";
}

/** Maps an SDK rejection / error text to a Hebrew message. Unknown text becomes the generic "could not verify" message, never the raw text. */
export function mapPaymeFailureToHebrew(failure: unknown): string {
  const text = textOf(failure).toLowerCase();
  if (/network|failed to fetch|fetch failed|timeout|timed out|offline|connection|econn|load failed/.test(text)) return COMMUNICATION_ERROR_MESSAGE;
  if (/email/.test(text)) return PAYER_ERROR.email;
  if (/phone/.test(text)) return PAYER_ERROR.phone;
  if (/first.?name|last.?name|payerfirstname|payerlastname|letters only/.test(text)) return PAYER_ERROR.name;
  if (/card|number|expir|cvv|cvc|security code|date|luhn|brand/.test(text)) return CARD_ERROR_MESSAGE;
  return UNKNOWN_PAYMENT_ERROR_MESSAGE;
}

export type TokenizeResult = {
  type?: string;
  token?: string;
  card?: { cardMask?: string };
  errors?: Record<string, { message?: string } | string>;
  message?: string;
  error?: string;
  statusCode?: number;
  validationError?: boolean;
};
export type TokenizeFn = (saleData: Record<string, unknown>) => Promise<TokenizeResult>;

export const SESSION_EXPIRED_MESSAGE = "טופס התשלום פג תוקף ונטען מחדש. הזינו שוב את פרטי הכרטיס. לא בוצע חיוב.";
export const PAYMENT_CONFIG_ERROR_MESSAGE = "אירעה תקלה בהגדרות התשלום. לא בוצע חיוב. אנא פנו אלינו ונטפל בכך.";

export type TokenizeOutcome =
  /** The browser-side check failed: nothing was sent to PayMe, the card fields are untouched. */
  | { status: "invalid"; fieldErrors: PayerFieldErrors }
  /**
   * PayMe refused (rejection or error result): a Hebrew message; `restartSession` when the card session may be spent.
   * `code` is a short, safe diagnostic (error kind, HTTP status, NAMES of the fields PayMe complained about - never values,
   * the token, card data or the raw payload) that the user can quote to support.
   */
  | { status: "failed"; message: string; restartSession: boolean; code: string }
  | { status: "ok"; token: string; cardMask: string | null };

type FailureShape = { text: string; statusCode: number | null; fieldKeys: string[]; isObject: boolean };

function describeFailure(value: unknown): FailureShape {
  if (value && typeof value === "object" && !(value instanceof Error)) {
    // PayMe's SDK REJECTS a tokenize-error with a plain object: { type, error, message, statusCode, validationError, errors: { <field>: message } }.
    const raw = value as Record<string, unknown>;
    const errors = raw.errors && typeof raw.errors === "object" ? (raw.errors as Record<string, unknown>) : {};
    const fieldKeys = Object.keys(errors);
    const text = [textOf(raw), typeof raw.error === "string" ? raw.error : "", ...fieldKeys.map((key) => `${key} ${textOf(errors[key])}`)].join(" ");
    return { text, statusCode: typeof raw.statusCode === "number" ? raw.statusCode : null, fieldKeys, isObject: true };
  }
  return { text: textOf(value), statusCode: null, fieldKeys: [], isObject: false };
}

/** Field NAMES only: a plain letters-only name (cardNumber, payerEmail...) passes, anything else (digits, spaces) becomes "field". Values never reach the code. */
function safeKey(key: string): string {
  return /^[A-Za-z]{1,24}$/.test(key) ? key : "field";
}

function messageForFieldKey(key: string): string | null {
  const k = key.toLowerCase();
  if (k.includes("email")) return PAYER_ERROR.email;
  if (k.includes("phone")) return PAYER_ERROR.phone;
  if (k.includes("firstname") || k.includes("lastname")) return PAYER_ERROR.name;
  if (/number|expir|cvc|cvv|card/.test(k)) return CARD_ERROR_MESSAGE;
  return null;
}

type Classified = { message: string; code: string };

function classifyFailure(failure: FailureShape): Classified {
  const { text, statusCode, fieldKeys } = failure;
  const lower = text.toLowerCase();
  const statusCode_ = statusCode === null ? "" : `status-${statusCode}`;

  if (/bad session|session expired|session.*deleted/.test(lower)) return { message: SESSION_EXPIRED_MESSAGE, code: "bad-session" };

  if (fieldKeys.length > 0) {
    const keys = fieldKeys.map(safeKey).filter(Boolean).slice(0, 4);
    const payerMessage = fieldKeys.map(messageForFieldKey).find((m) => m && m !== CARD_ERROR_MESSAGE);
    const message = payerMessage ?? (fieldKeys.some((key) => messageForFieldKey(key) === CARD_ERROR_MESSAGE) ? CARD_ERROR_MESSAGE : UNKNOWN_PAYMENT_ERROR_MESSAGE);
    return { message, code: `fields:${keys.join("+")}` };
  }

  if (statusCode === 401 || statusCode === 403 || /unauthori[sz]ed|forbidden|api key|public key|invalid key/.test(lower)) {
    return { message: PAYMENT_CONFIG_ERROR_MESSAGE, code: statusCode_ || "config" };
  }
  if (statusCode !== null && statusCode >= 500) return { message: COMMUNICATION_ERROR_MESSAGE, code: statusCode_ };

  const message = mapPaymeFailureToHebrew(text);
  let code = statusCode_ || "unknown";
  if (message === COMMUNICATION_ERROR_MESSAGE) code = "network";
  else if (message === CARD_ERROR_MESSAGE) code = "card";
  else if (message === PAYER_ERROR.email) code = "payer-email";
  else if (message === PAYER_ERROR.phone) code = "payer-phone";
  else if (message === PAYER_ERROR.name) code = "payer-name";
  return { message, code };
}

/**
 * The whole tokenization step: validate the payer fields, call tokenize() with the normalized phone, and turn every way it can
 * go wrong into a Hebrew outcome. A thrown / rejected tokenize() is caught here explicitly - including the plain-object
 * rejection PayMe's SDK uses for its own tokenize-error results.
 */
export async function tokenizeWithPayer(tokenize: TokenizeFn, payer: PayerInput, total: { label: string; amount: { currency: string; value: string } }): Promise<TokenizeOutcome> {
  const fieldErrors = validatePayer(payer);
  if (Object.keys(fieldErrors).length > 0) return { status: "invalid", fieldErrors };

  let result: TokenizeResult;
  try {
    result = await tokenize({ ...toSdkPayer(payer), total });
  } catch (rejection) {
    const { message, code } = classifyFailure(describeFailure(rejection));
    // A payer-field problem is refused before the card is used, so the card session is still good; anything else may have consumed it.
    const payerProblem = message === PAYER_ERROR.name || message === PAYER_ERROR.email || message === PAYER_ERROR.phone;
    return { status: "failed", message, restartSession: !payerProblem, code };
  }

  if (result?.type === "tokenize-success" && typeof result.token === "string" && result.token) {
    return { status: "ok", token: result.token, cardMask: result.card?.cardMask ?? null };
  }

  // An error RESULT: map its text / field keys, never show it as it came.
  const { message, code } = classifyFailure(describeFailure(result));
  return { status: "failed", message, restartSession: true, code };
}
