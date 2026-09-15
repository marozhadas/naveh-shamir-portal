"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { getSiteOrigin } from "@/utils/site-origin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";

export type ForgotPasswordState = { status: "idle" | "sent" | "error"; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Always returns the exact same "sent" outcome for any syntactically valid email, regardless of
 * whether an account actually exists for it (spec: "אין לחשוף אם האימייל קיים") — only a
 * malformed email or a rate limit produces a different message, neither of which reveals account
 * existence. Routes through /auth/callback (same code-exchange path as every other sign-in
 * method) with an explicit `next` so the reset page — not the ownership-aware dashboard/plans
 * default — is where the recovery session lands.
 */
export async function requestPasswordResetAction(_prevState: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "כתובת המייל אינה תקינה." };
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`owner-forgot-password:${ip}`, 5, 600);
  if (allowed) {
    const supabase = createPublicSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent("/business/owner/reset-password")}`,
    });
    if (error) console.error("[requestPasswordResetAction] resetPasswordForEmail failed:", error.message);
  }

  return { status: "sent", message: "אם קיים חשבון עם הכתובת הזו, נשלחו אליו הוראות לאיפוס הסיסמה." };
}
