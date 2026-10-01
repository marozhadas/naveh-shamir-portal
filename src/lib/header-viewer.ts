import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type HeaderViewer = { firstName: string };

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0];
}

/**
 * What the Header shows for the currently signed-in business owner — a REAL Supabase Auth
 * session only, never the demo viewer-switcher cookie (that's not a real identity; see
 * mock-auth-adapter.ts). Fetched exactly once, server-side, in the root layout alongside the
 * other once-per-request reads (isAdminAuthenticated, getPublishedPageContent) and handed down
 * via HeaderViewerContext — nothing re-fetches this per page or per component.
 *
 * One Supabase client, one auth.getUser() call, and — only for a signed-in user — one `profiles`
 * read via the SAME client (RLS already lets a user read their own row; no service-role client
 * needed here).
 *
 * Name source priority: profiles.display_name -> the Google OAuth name in user_metadata
 * (full_name, falling back to name) -> profiles.username -> the local part of the email (never
 * the full address) as a last resort when no profile row exists at all. Only the first name is
 * ever shown, even when the resolved name has more than one word.
 */
export async function getHeaderViewerDisplay(): Promise<HeaderViewer | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const { data: profile } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle();

  const metadata = user.user_metadata as Record<string, unknown> | null;
  const googleName =
    typeof metadata?.full_name === "string" && metadata.full_name
      ? metadata.full_name
      : typeof metadata?.name === "string" && metadata.name
        ? metadata.name
        : null;

  const fullName = profile?.display_name || googleName || profile?.username || user.email.split("@")[0];
  return { firstName: firstNameOf(fullName) };
}
