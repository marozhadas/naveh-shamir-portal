import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { claimUnownedRegistrationsForEmail, resolvePostLoginPath } from "@/repositories/owner-auth-service";

/**
 * Where a business owner lands after any code-exchange sign-in: the magic-link email, "continue
 * with Google" (startGoogleOAuthAction), or a password-reset email link — Supabase's code-exchange
 * shape is identical for all three, so none of them need their own callback logic. Exchanges the
 * one-time code for a real session (setting httpOnly cookies via @supabase/ssr), then performs the
 * ownership claim: any business_registrations row whose `email` matches this now-verified
 * session's email AND has no owner yet gets claimed. This is a FALLBACK mechanism now — the
 * primary one is owner_id being set directly at registration time when the submitter was already
 * signed in (see business/register/actions.ts, business/register/plus/actions.ts) — for the
 * remaining case: someone who registered anonymously and only creates/signs into an account
 * afterward. loginWithPasswordAction calls the exact same shared function, so this behaves
 * identically no matter which sign-in method the owner used (spec section 9).
 *
 * `next`, when the caller passes one explicitly (e.g. the password-reset flow always passes
 * `/business/owner/reset-password`), wins outright. Otherwise the destination is ownership-aware
 * (spec section 10): the dashboard if this user already owns a business, /business/plans if not —
 * rather than the fixed `/business/trial` this always used to fall back to.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/business/owner/login?error=missing-code`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/business/owner/login?error=invalid-link`);
  }

  if (isSupabaseAdminConfigured()) {
    try {
      await claimUnownedRegistrationsForEmail(data.user.id, data.user.email);
    } catch (err) {
      // A claim failure must never block the sign-in itself — the owner can still reach their
      // dashboard, which will just show "no business yet" until this is retried/investigated.
      console.error("[auth/callback] ownership claim failed", err);
    }
  }

  const next = explicitNext ?? (await resolvePostLoginPath(data.user.id));
  return NextResponse.redirect(`${origin}${next}`);
}
