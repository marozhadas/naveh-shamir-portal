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
  statusCode?: number;
};
export type TokenizeFn = (saleData: Record<string, unknown>) => Promise<TokenizeResult>;

export type TokenizeOutcome =
  /** The browser-side check failed: nothing was sent to PayMe, the card fields are untouched. */
  | { status: "invalid"; fieldErrors: PayerFieldErrors }
  /** PayMe refused (rejection or error result): a Hebrew message; `restartSession` when the card session may be spent. */
  | { status: "failed"; message: string; restartSession: boolean }
  | { status: "ok"; token: string; cardMask: string | null };

/**
 * The whole tokenization step: validate the payer fields, call tokenize() with the normalized phone, and turn every way it can
 * go wrong into a Hebrew outcome. A thrown / rejected tokenize() is caught here explicitly.
 */
export async function tokenizeWithPayer(tokenize: TokenizeFn, payer: PayerInput, total: { label: string; amount: { currency: string; value: string } }): Promise<TokenizeOutcome> {
  const fieldErrors = validatePayer(payer);
  if (Object.keys(fieldErrors).length > 0) return { status: "invalid", fieldErrors };

  let result: TokenizeResult;
  try {
    result = await tokenize({ ...toSdkPayer(payer), total });
  } catch (rejection) {
    const message = mapPaymeFailureToHebrew(rejection);
    // The SDK rejects payer-field problems before it sends anything, so the card session is still good; anything else may have consumed it.
    const payerProblem = message === PAYER_ERROR.name || message === PAYER_ERROR.email || message === PAYER_ERROR.phone;
    return { status: "failed", message, restartSession: !payerProblem };
  }

  if (result?.type === "tokenize-success" && typeof result.token === "string" && result.token) {
    return { status: "ok", token: result.token, cardMask: result.card?.cardMask ?? null };
  }

  // An error RESULT from PayMe: map its text / field keys, never show it as it came.
  const parts = [textOf(result), ...Object.entries(result?.errors ?? {}).map(([key, value]) => `${key} ${textOf(value)}`)].join(" ");
  const hasFieldErrors = Object.keys(result?.errors ?? {}).length > 0;
  const mapped = mapPaymeFailureToHebrew(parts);
  return { status: "failed", message: mapped === UNKNOWN_PAYMENT_ERROR_MESSAGE && hasFieldErrors ? CARD_ERROR_MESSAGE : mapped, restartSession: true };
}
