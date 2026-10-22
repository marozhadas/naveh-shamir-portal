import "server-only";
import { getSupabaseSessionUser } from "@/lib/supabase/server-client";
import { getSumitRegistrationPayment, type SumitRegistrationPayment } from "@/lib/sumit/registration-access";
import { findRegistrationAwaitingPaymentMethod, findRegistrationWithSavedPaymentMethod } from "@/repositories/supabase-subscription-service";
import type { PaymentResumeRegistration } from "@/lib/payme/payment-resume";

export const PAYMENT_METHOD_ROUTE = "/business/payment-method";

export type PaymentResume = PaymentResumeRegistration & { payment: SumitRegistrationPayment };

/**
 * Does the signed-in owner have a registration that still has to complete step 6? Everything comes from the server: the verified
 * session user, the registration found by that user's id (never an id from the URL or the browser), and the SUMIT card-step access
 * for THIS user (SUMIT_TEST_EMAILS on the approved test organization - see lib/sumit/registration-access.ts). Null when anything
 * does not hold - and then nothing is offered. Callers that render client components must pass on only what they need (never the
 * whole object).
 */
export async function getPaymentResume(): Promise<PaymentResume | null> {
  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser) return null;
  const payment = getSumitRegistrationPayment(sessionUser.email);
  if (!payment) return null;
  const registration = await findRegistrationAwaitingPaymentMethod(sessionUser.id);
  if (!registration) return null;
  return { ...registration, payment };
}

export type SavedCardNotice = { businessName: string };

/**
 * READ ONLY: for the signed-in owner who may see the SUMIT card step (same gate as above), is the card of their pending registration
 * ALREADY saved? Then the continue page says so ("the card is saved") instead of offering the form or silently sending them away.
 * Returns only the business name. Null for everyone else - other users never learn anything about it.
 */
export async function getSavedCardNotice(): Promise<SavedCardNotice | null> {
  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser) return null;
  if (!getSumitRegistrationPayment(sessionUser.email)) return null;
  const registration = await findRegistrationWithSavedPaymentMethod(sessionUser.id);
  return registration ? { businessName: registration.businessName } : null;
}
