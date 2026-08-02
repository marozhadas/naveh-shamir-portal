import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

/**
 * Where a business owner lands after clicking their magic-link email. Exchanges the one-time code
 * for a real session (setting httpOnly cookies via @supabase/ssr), then performs the ownership
 * claim: any business_registrations row whose `email` matches this now-verified session's email
 * AND has no owner yet gets claimed. This is the only place a registration's owner_id is ever set
 * from something resembling user input — and even here, the "input" is a Supabase-verified email
 * address from a real session, never a client-supplied id, query param, or unverified form field.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/business/trial";

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

  return NextResponse.redirect(`${origin}${next}`);
}

async function claimUnownedRegistrationsForEmail(userId: string, email: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  // Claimed regardless of status — a pending or even rejected registration still belongs to
  // whoever submitted it, so their dashboard can show its real status either way.
  const { data: matches, error: selectError } = await admin
    .from("business_registrations")
    .select("id")
    .eq("email", email)
    .is("owner_id", null);
  if (selectError) throw new Error(selectError.message);
  if (!matches || matches.length === 0) return;

  const { error: updateError } = await admin
    .from("business_registrations")
    .update({ owner_id: userId })
    .in(
      "id",
      matches.map((m) => m.id),
    );
  if (updateError) throw new Error(updateError.message);

  await admin.from("business_events_log").insert(
    matches.map((m) => ({
      business_registration_id: m.id,
      event_type: "ownership_claimed" as const,
      actor_id: userId,
      metadata: {},
    })),
  );
}
