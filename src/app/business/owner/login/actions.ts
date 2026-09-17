"use server";

import { redirect } from "next/navigation";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getSiteOrigin } from "@/utils/site-origin";
import { looksLikeEmail, normalizeUsername } from "@/utils/username";
import { resolveUsernameToEmail, resolvePostLoginPath, claimUnownedRegistrationsForEmail } from "@/repositories/owner-auth-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";

export type RequestMagicLinkState = { status: "idle" | "sent" | "error"; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a Supabase magic-link email — an optional/fallback sign-in method now that username or
 * email + password, and Google, are the primary ones (spec: keep it available, don't remove it
 * before the new methods are verified in production). Always returns a generic "sent"
 * outcome-shaped message on success without confirming whether the address actually has a
 * registration, matching normal magic-link UX (never leak account existence).
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

export type LoginWithPasswordState = { status: "idle" | "error"; message?: string };

const GENERIC_LOGIN_ERROR = "שם המשתמש/האימייל או הסיסמה אינם נכונים.";

/**
 * Username/email + password sign-in. `identifier` containing "@" is treated as an email directly;
 * otherwise it's resolved to an email server-side via profiles (never exposed to the browser —
 * see resolveUsernameToEmail). Every failure path — rate-limited, unknown username, wrong
 * password, unknown email — returns the exact same generic message, so none of them can be told
 * apart from the outside (spec section 7: no user enumeration).
 */
export async function loginWithPasswordAction(_prevState: LoginWithPasswordState, formData: FormData): Promise<LoginWithPasswordState> {
  const identifierRaw = formData.get("identifier");
  const passwordRaw = formData.get("password");
  const identifier = typeof identifierRaw === "string" ? identifierRaw.trim() : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  if (!identifier) return { status: "error", message: "יש להזין שם משתמש או אימייל." };
  if (!password) return { status: "error", message: "יש להזין סיסמה." };

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`owner-login:${ip}`, 10, 600);
  if (!allowed) return { status: "error", message: GENERIC_LOGIN_ERROR };

  const email = looksLikeEmail(identifier) ? identifier : await resolveUsernameToEmail(normalizeUsername(identifier));
  if (!email) return { status: "error", message: GENERIC_LOGIN_ERROR };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { status: "error", message: GENERIC_LOGIN_ERROR };

  // Same fallback ownership claim /auth/callback runs for magic-link/Google — password sign-in
  // doesn't go through that route at all, so without this it would be the one method that never
  // claims a business registered anonymously before the account existed (spec section 9).
  if (data.user.email) {
    try {
      await claimUnownedRegistrationsForEmail(data.user.id, data.user.email);
    } catch (err) {
      console.error("[loginWithPasswordAction] ownership claim failed", err);
    }
  }

  redirect(await resolvePostLoginPath(data.user.id));
}

/**
 * Starts the Google sign-in flow: gets the provider URL from Supabase (skipping its own browser
 * redirect, since this runs server-side) and redirects the browser there via Next's own
 * redirect(). Google itself, then Supabase's own /auth/v1/callback, then this app's
 * /auth/callback (which exchanges the code for a session exactly like the magic-link flow does)
 * — no provider-specific code needed there at all.
 */
export async function startGoogleOAuthAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteOrigin()}/auth/callback`, skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    console.error("[startGoogleOAuthAction] signInWithOAuth failed:", error?.message);
    redirect("/business/owner/login?error=google-unavailable");
  }
  redirect(data.url);
}
