import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { BusinessRegistrationRow } from "@/types/business-registration";

/**
 * Admin-curated homepage picks — approved AND explicitly marked `featured` via /admin/businesses.
 * RLS already restricts the anon/publishable client to status="approved" rows (see the
 * create_business_registrations migration), so the `.eq("status", "approved")` here is
 * belt-and-suspenders, not the only guard. Never throws — an unreachable/misconfigured Supabase
 * just means the homepage teaser renders its empty state instead of crashing the page.
 */
export async function getFeaturedApprovedBusinesses(limit = 4): Promise<BusinessRegistrationRow[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("business_registrations")
      .select("*")
      .eq("status", "approved")
      .eq("featured", true)
      .order("reviewed_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[getFeaturedApprovedBusinesses] failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("[getFeaturedApprovedBusinesses] failed:", error);
    return [];
  }
}
