import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

/**
 * Looks up whether `oldSlug` was a business's previous slug and, if so, returns where it moved to.
 * Uses the public client (same as every other public profile-page read) since this table carries
 * no sensitive data — just an old-slug -> new-slug mapping (see the
 * create_business_slug_redirects migration). Never throws: a lookup failure should never break
 * rendering the (real, current) 404/not-found page for a genuinely unknown slug.
 */
export async function findSlugRedirectTarget(oldSlug: string): Promise<string | null> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("business_slug_redirects").select("new_slug").eq("old_slug", oldSlug).maybeSingle();
    if (error || !data) return null;
    return data.new_slug;
  } catch {
    return null;
  }
}

/** Admin-only write — called exclusively from changeBusinessSlugAction right after a slug change succeeds. */
export async function recordSlugRedirect(businessId: string, oldSlug: string, newSlug: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  // A slug that was itself the "new" side of an earlier redirect should stop pointing there once
  // it becomes an "old" slug in its own right — upsert on old_slug (unique) keeps a single hop.
  const { error } = await supabase
    .from("business_slug_redirects")
    .upsert({ business_id: businessId, old_slug: oldSlug, new_slug: newSlug }, { onConflict: "old_slug" });
  if (error) throw new Error(error.message);
}
