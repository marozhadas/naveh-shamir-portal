"use server";

import { revalidatePath } from "next/cache";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { getSupabaseSessionUser } from "@/lib/supabase/server-client";
import { cancelOwnedPayMeSubscription, savePaymentMethodForRegistration, startRealBusinessTrialWithPaymentMethod } from "@/repositories/supabase-subscription-service";
import { isPayMeConfigured } from "@/lib/payme/config";
import { getPayMeConfigForBusiness } from "@/lib/payme/flow-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSupabaseBusinessId } from "@/utils/business-id";
import { PAYMENTS_TEMPORARILY_UNAVAILABLE, PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE } from "@/lib/payments/payments-unavailable";

export type ActivateTrialState = { status: "idle" | "error" | "success"; message?: string; code?: typeof PAYMENTS_TEMPORARILY_UNAVAILABLE };

/** The safe answer while no payment provider is connected (SUMIT is not live in the UI yet; PayMe is dormant and never a fallback). */
function paymentsUnavailable(): { status: "error"; message: string; code: typeof PAYMENTS_TEMPORARILY_UNAVAILABLE } {
  return { status: "error", message: PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE, code: PAYMENTS_TEMPORARILY_UNAVAILABLE };
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,120}$/;
const CARD_MASK_PATTERN = /^[0-9*xX\- ]{8,25}$/;

const ERROR_MESSAGE: Record<string, string> = {
  "payme-not-configured": PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE,
  "payme-rejected": "לא הצלחנו להגדיר את אמצעי התשלום. לא בוצע חיוב. נסו שוב או בדקו את פרטי הכרטיס.",
  "invalid-plan": "לא ניתן להפעיל מנוי בתשלום לעסק בהגדרות הנוכחיות. בחרו חבילה בעמוד החבילות. לא בוצע חיוב.",
  "already-exists": "תקופת הניסיון כבר הופעלה לעסק הזה.",
  "not-eligible": "העסק עדיין אינו זכאי להפעלת ניסיון (נדרש אישור הצוות וכתובת URL לעסק).",
  "unknown-error": "אירעה תקלה בהפעלת הניסיון. לא בוצע חיוב. נסו שוב בעוד כמה רגעים.",
};

/**
 * Receives ONLY PayMe's opaque tokenization result from the browser — card number, expiry and CVV were typed
 * into PayMe's Hosted Fields iframe and never reach this server. Everything that matters is decided here, on
 * the server: who the signed-in owner is and which business is theirs (never a client-supplied id), whether
 * the business is eligible, the trial length (from the business's stored offer) and the price (from the
 * stored plan + billing interval). Never logs or returns the token.
 */
export async function activateTrialWithPaymentMethodAction(input: { token: string; cardMask?: string | null; consent: boolean }): Promise<ActivateTrialState> {
  if (!isPayMeConfigured()) return paymentsUnavailable();

  const user = await authAdapter.getCurrentUser();
  if (!user) return { status: "error", message: "יש להתחבר כבעל/ת העסק כדי להפעיל את הניסיון." };
  if (input.consent !== true) return { status: "error", message: "יש לאשר את תנאי השימוש ותנאי תקופת הניסיון כדי להמשיך." };

  const businessId = user.ownedBusinessIds[0];
  if (!businessId || !isSupabaseBusinessId(businessId)) return { status: "error", message: "לא נמצא עסק המשויך לחשבון זה." };

  // Sandbox guard: while PAYME_ENV=sandbox only an admin-enabled business may go on (the service layer checks again).
  if (!(await getPayMeConfigForBusiness(businessId))) return paymentsUnavailable();

  if (typeof input.token !== "string" || !TOKEN_PATTERN.test(input.token)) return { status: "error", message: ERROR_MESSAGE["payme-rejected"] };
  const cardMask = typeof input.cardMask === "string" && CARD_MASK_PATTERN.test(input.cardMask) ? input.cardMask : null;

  if (!(await checkRateLimit(`payment-method:${user.id}`, 8, 3600))) {
    return { status: "error", message: "בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." };
  }

  const result = await startRealBusinessTrialWithPaymentMethod(businessId, user.id, input.token, cardMask);
  if (!result.success) return { status: "error", message: ERROR_MESSAGE[result.reason] ?? ERROR_MESSAGE["unknown-error"] };

  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/subscription");
  return { status: "success" };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REGISTRATION_ERROR_MESSAGE: Record<string, string> = {
  ...ERROR_MESSAGE,
  "not-eligible": "לא ניתן לשמור אמצעי תשלום להרשמה הזו. אם ההרשמה כבר אושרה או נדחתה, פנו אלינו.",
  "already-exists": "למנוי של העסק הזה כבר הוגדר תשלום.",
  "invalid-plan": "לא ניתן לשמור אמצעי תשלום לעסק בהגדרות הנוכחיות. בחרו חבילה בתשלום בעמוד החבילות. לא בוצע חיוב.",
};

export type SavePaymentMethodState = { status: "idle" | "error" | "success"; message?: string; code?: typeof PAYMENTS_TEMPORARILY_UNAVAILABLE };

/**
 * Step 6 of the Plus/Premium registration. Hosted Fields only tokenized the card; this keeps the token server-side
 * (it is the buyer_key) and the masked card, and does NOTHING else: no subscription, no trial, no approval, no publishing
 * (the business stays pending until an admin approves it - that approval creates the subscription).
 *
 * Only PayMe's opaque token, the masked card and the consent come from the browser; the registration id is a pointer the server
 * verifies belongs to the signed-in owner. The token is never logged and never returned.
 */
export async function savePaymentMethodForRegistrationAction(input: { registrationId: string; token: string; cardMask?: string | null; consent: boolean }): Promise<SavePaymentMethodState> {
  if (!isPayMeConfigured()) return paymentsUnavailable();

  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser) return { status: "error", message: "ההתחברות פגה. יש להתחבר מחדש כדי להשלים את ההרשמה." };
  if (input.consent !== true) return { status: "error", message: "יש לאשר את תנאי אמצעי התשלום ותקופת הניסיון כדי להמשיך." };
  if (typeof input.registrationId !== "string" || !UUID_PATTERN.test(input.registrationId)) return { status: "error", message: REGISTRATION_ERROR_MESSAGE["not-eligible"] };
  if (typeof input.token !== "string" || !TOKEN_PATTERN.test(input.token)) return { status: "error", message: ERROR_MESSAGE["payme-rejected"] };
  const cardMask = typeof input.cardMask === "string" && CARD_MASK_PATTERN.test(input.cardMask) ? input.cardMask : null;

  if (!(await checkRateLimit(`payment-method:${sessionUser.id}`, 8, 3600))) {
    return { status: "error", message: "בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." };
  }

  const result = await savePaymentMethodForRegistration(input.registrationId, sessionUser.id, sessionUser.email, input.token, cardMask);
  if (!result.success) return { status: "error", message: REGISTRATION_ERROR_MESSAGE[result.reason] ?? ERROR_MESSAGE["unknown-error"] };
  return { status: "success" };
}

export type CancelSubscriptionState = { status: "idle" | "error" | "success"; message?: string; code?: typeof PAYMENTS_TEMPORARILY_UNAVAILABLE };

/** Cancel the owner's own PayMe subscription. The business is resolved from the session; no id comes from the client. */
export async function cancelPayMeSubscriptionAction(): Promise<CancelSubscriptionState> {
  // PayMe is dormant: its cancel API is unreachable, so nothing is attempted (no PayMe subscription exists to cancel anyway).
  if (!isPayMeConfigured()) return paymentsUnavailable();
  const user = await authAdapter.getCurrentUser();
  if (!user) return { status: "error", message: "יש להתחבר כדי לבטל את המנוי." };
  const businessId = user.ownedBusinessIds[0];
  if (!businessId || !isSupabaseBusinessId(businessId)) return { status: "error", message: "לא נמצא עסק המשויך לחשבון זה." };

  const result = await cancelOwnedPayMeSubscription(businessId, user.id);
  if (!result.success) {
    return {
      status: "error",
      message: result.reason === "already-ended" ? "המנוי כבר בוטל." : "לא הצלחנו לבטל את המנוי כרגע. נסו שוב בעוד רגע.",
    };
  }
  revalidatePath("/business/dashboard");
  revalidatePath("/business/dashboard/subscription");
  return { status: "success" };
}
