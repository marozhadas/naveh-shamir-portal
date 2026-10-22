"use server";

import { getSupabaseSessionUser } from "@/lib/supabase/server-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCardSavedStatusForRegistration, saveSumitPaymentMethodForRegistration, type SaveSumitPaymentMethodResult } from "@/repositories/sumit-payment-method-service";
import { getSumitRegistrationPayment } from "@/lib/sumit/registration-access";
import { PAYMENTS_TEMPORARILY_UNAVAILABLE, PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE } from "@/lib/payments/payments-unavailable";
import { validatePayer } from "@/components/business-dashboard/PaymentMethodTrialForm/tokenize-payer";
import { isPlausibleSumitToken } from "@/lib/sumit/token-shape";

export type SaveSumitCardState = { status: "idle" | "error" | "success"; message?: string; code?: typeof PAYMENTS_TEMPORARILY_UNAVAILABLE };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOP_LEVEL_KEYS = ["registrationId", "token", "payer", "consent"];
const PAYER_KEYS = ["firstName", "lastName", "email", "phone"];

const GENERIC_ERROR = "אירעה תקלה בשמירת אמצעי התשלום. לא בוצע חיוב. נסו שוב בעוד כמה רגעים.";
const MESSAGE: Record<Exclude<SaveSumitPaymentMethodResult, { success: true }>["reason"], string> = {
  "sumit-not-configured": PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE,
  "invalid-input": "הפרטים שנשלחו אינם תקינים. בדקו אותם ונסו שוב. לא בוצע חיוב.",
  "not-eligible": "לא ניתן לשמור אמצעי תשלום להרשמה הזו. אם ההרשמה כבר אושרה או נדחתה, פנו אלינו.",
  "already-exists": "למנוי של העסק הזה כבר הוגדר תשלום.",
  "invalid-plan": "לא ניתן לשמור אמצעי תשלום לעסק בהגדרות הנוכחיות. בחרו חבילה בתשלום בעמוד החבילות. לא בוצע חיוב.",
  rejected: "לא הצלחנו לשמור את אמצעי התשלום. לא בוצע חיוב. בדקו את פרטי הכרטיס ונסו שוב.",
  "provider-error": GENERIC_ERROR,
  "unknown-error": GENERIC_ERROR,
};

function hasOnlyKeys(value: object, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

/**
 * Step 6 of the Plus/Premium registration, SUMIT flavour: SAVE A CARD, nothing else (no charge, no subscription, no trial, no
 * approval - the business stays pending).
 *
 * What comes from the browser: the registration id (a pointer the server re-checks against the signed-in owner), SUMIT's
 * one-time token (payments.js produced it from the card typed on the page - the card itself never reaches this server), the
 * payer's name / email / phone and the consent. NOTHING ELSE is accepted: any other property - a card number, an expiry, a
 * CVV, an ID number, anything - makes the whole call fail before it is read, and a token that looks like a card number is
 * refused. This function never logs, stores or returns the token, and returns only a status and a Hebrew message.
 *
 * Who may use it is decided here again on the server (the same rule as the page that drew the form): the approved TEST
 * organization and an email on SUMIT_TEST_EMAILS - SUMIT_DRY_RUN does not widen it.
 */
export async function saveSumitPaymentMethodForRegistrationAction(input: { registrationId: string; token: string; payer: { firstName: string; lastName: string; email: string; phone: string }; consent: boolean }): Promise<SaveSumitCardState> {
  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser) return { status: "error", message: "ההתחברות פגה. יש להתחבר מחדש כדי להשלים את ההרשמה." };

  if (!getSumitRegistrationPayment(sessionUser.email)) return { status: "error", message: PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE, code: PAYMENTS_TEMPORARILY_UNAVAILABLE };

  // An unexpected shape (extra properties, e.g. card fields) is refused without being read or echoed.
  if (!input || typeof input !== "object" || !hasOnlyKeys(input, TOP_LEVEL_KEYS) || !input.payer || typeof input.payer !== "object" || !hasOnlyKeys(input.payer, PAYER_KEYS)) {
    return { status: "error", message: MESSAGE["invalid-input"] };
  }
  if (input.consent !== true) return { status: "error", message: "יש לאשר את שמירת אמצעי התשלום כדי להמשיך." };
  if (typeof input.registrationId !== "string" || !UUID_PATTERN.test(input.registrationId)) return { status: "error", message: MESSAGE["not-eligible"] };
  if (typeof input.token !== "string" || !isPlausibleSumitToken(input.token)) return { status: "error", message: MESSAGE["invalid-input"] };

  const { firstName, lastName, email, phone } = input.payer;
  if ([firstName, lastName, email, phone].some((field) => typeof field !== "string")) return { status: "error", message: MESSAGE["invalid-input"] };
  if (Object.keys(validatePayer({ firstName, lastName, email, phone })).length > 0) return { status: "error", message: MESSAGE["invalid-input"] };

  if (!(await checkRateLimit(`payment-method:${sessionUser.id}`, 8, 3600))) {
    return { status: "error", message: "בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." };
  }

  const result = await saveSumitPaymentMethodForRegistration({
    registrationId: input.registrationId,
    ownerId: sessionUser.id,
    registrantEmail: sessionUser.email,
    payer: { name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim(), phone: phone.replace(/[\s\-.()]/g, "") },
    singleUseToken: input.token,
  });
  if (!result.success) {
    return result.reason === "sumit-not-configured"
      ? { status: "error", message: MESSAGE[result.reason], code: PAYMENTS_TEMPORARILY_UNAVAILABLE }
      : { status: "error", message: MESSAGE[result.reason] ?? GENERIC_ERROR };
  }
  return { status: "success" };
}

export type SumitCardSavedState = { status: "saved" | "not-saved" | "error" };

/**
 * READ ONLY: has this owner's registration already got a saved card? The step-6 wrapper asks it before showing the form, so coming
 * back after a save that finished on the server shows "already saved" instead of asking for the card again. Same access rule as the
 * save (signed-in owner on SUMIT_TEST_EMAILS, test organization). It returns only a status - never an id, a mask or a token - and
 * never starts a save: nothing is re-saved automatically.
 */
export async function getSumitCardSavedStatusAction(input: { registrationId: string }): Promise<SumitCardSavedState> {
  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser || !getSumitRegistrationPayment(sessionUser.email)) return { status: "error" };
  if (!input || typeof input !== "object" || !hasOnlyKeys(input, ["registrationId"]) || typeof input.registrationId !== "string" || !UUID_PATTERN.test(input.registrationId)) return { status: "error" };
  const result = await getCardSavedStatusForRegistration({ registrationId: input.registrationId, ownerId: sessionUser.id });
  return { status: result.status };
}
