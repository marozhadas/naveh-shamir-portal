"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { getSiteOrigin } from "@/utils/site-origin";

export type RequestMagicLinkState = { status: "idle" | "sent" | "error"; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a Supabase magic-link email — the only way a business owner ever authenticates in this
 * system (spec section 4: no password, no query param, no localStorage flag counts as identity).
 * Always returns a generic "sent" outcome-shaped message on success without confirming whether
 * the address actually has a registration, matching normal magic-link UX (never leak account
 * existence) and spec's own "don't expose internal reasons" principle.
 */
export async function requestOwnerMagicLinkAction(_prevState: RequestMagicLinkState, formData: FormData): Promise<RequestMagicLinkState> {
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "כתובת המייל אינה תקינה." };
  }

  const supabase = createPublicSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${getSiteOrigin()}/auth/callback` },
  });

  if (error) {
    console.error("[requestOwnerMagicLinkAction] signInWithOtp failed:", error.message);
    return { status: "error", message: "לא הצלחנו לשלוח את קישור ההתחברות כרגע. אפשר לנסות שוב בעוד רגע." };
  }

  return { status: "sent" };
}
