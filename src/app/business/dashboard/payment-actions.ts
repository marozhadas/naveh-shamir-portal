"use server";

import { revalidatePath } from "next/cache";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import { cancelOwnedPayMeSubscription, startRealBusinessTrialWithPaymentMethod } from "@/repositories/supabase-subscription-service";
import { isPayMeConfigured } from "@/lib/payme/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSupabaseBusinessId } from "@/utils/business-id";

export type ActivateTrialState = { status: "idle" | "error" | "success"; message?: string };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,120}$/;
const CARD_MASK_PATTERN = /^[0-9*xX\- ]{8,25}$/;

const ERROR_MESSAGE: Record<string, string> = {
  "payme-not-configured": "הסליקה עדיין לא הופעלה בפורטל. נסו שוב מאוחר יותר.",
  "payme-rejected": "לא הצלחנו להגדיר את אמצעי התשלום. לא בוצע חיוב. נסו שוב או בדקו את פרטי הכרטיס.",
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
  if (!isPayMeConfigured()) return { status: "error", message: ERROR_MESSAGE["payme-not-configured"] };

  const user = await authAdapter.getCurrentUser();
  if (!user) return { status: "error", message: "יש להתחבר כבעל/ת העסק כדי להפעיל את הניסיון." };
  if (input.consent !== true) return { status: "error", message: "יש לאשר את תנאי השימוש ותנאי תקופת הניסיון כדי להמשיך." };

  const businessId = user.ownedBusinessIds[0];
  if (!businessId || !isSupabaseBusinessId(businessId)) return { status: "error", message: "לא נמצא עסק המשויך לחשבון זה." };

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

export type CancelSubscriptionState = { status: "idle" | "error" | "success"; message?: string };

/** Cancel the owner's own PayMe subscription. The business is resolved from the session; no id comes from the client. */
export async function cancelPayMeSubscriptionAction(): Promise<CancelSubscriptionState> {
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
