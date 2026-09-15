import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

/**
 * Resolves a username to its account's email address — server-only, and the ONLY place this
 * lookup happens. The service-role client is required here: RLS on `profiles` only lets a user
 * read their own row, and this needs to read an arbitrary username's row before that user is
 * signed in. The resolved email is only ever fed straight into `signInWithPassword` on the server
 * — it must never be returned to the browser (spec: "אין להחזיר את האימייל ל-browser").
 */
export async function resolveUsernameToEmail(normalizedUsername: string): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("profiles").select("email").eq("username", normalizedUsername).maybeSingle();
  if (error || !data) return null;
  return data.email;
}

export async function isUsernameTaken(normalizedUsername: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("profiles").select("id").eq("username", normalizedUsername).maybeSingle();
  return data !== null;
}

type CreateProfileInput = { id: string; username: string; displayName: string; email: string };

export type CreateProfileResult = { success: true } | { success: false; reason: "username-taken" | "unexpected" };

/**
 * Server-only, service-role write — the only way a `profiles` row is ever created (there is no
 * insert policy for authenticated/anon; see create_profiles_table). Called right after a
 * successful `auth.signUp`, so `id` always comes from a real, just-created Supabase Auth user,
 * never client-supplied. Still handles a 23505 (unique violation) gracefully in case of a rare
 * race with another signup choosing the same username between the caller's own availability
 * pre-check and this insert.
 */
export async function createProfile({ id, username, displayName, email }: CreateProfileInput): Promise<CreateProfileResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "unexpected" };
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("profiles").insert({ id, username, display_name: displayName || null, email, role: "business_owner" });
  if (!error) return { success: true };
  if (error.code === "23505") return { success: false, reason: "username-taken" };
  console.error("[createProfile] insert failed:", error.message);
  return { success: false, reason: "unexpected" };
}

/** Where to send someone right after they sign in — the dashboard if they already own a business, otherwise the plans page, per spec section 10. */
export async function resolvePostLoginPath(userId: string): Promise<"/business/dashboard" | "/business/plans"> {
  if (!isSupabaseAdminConfigured()) return "/business/plans";
  const admin = createAdminSupabaseClient();
  const { count } = await admin.from("business_registrations").select("*", { count: "exact", head: true }).eq("owner_id", userId);
  return count && count > 0 ? "/business/dashboard" : "/business/plans";
}
