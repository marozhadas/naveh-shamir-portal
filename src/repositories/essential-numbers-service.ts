import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { EssentialNumberRow } from "@/types/essential-number";

/** RLS restricts anon to status="published" rows already — the .eq() here is belt-and-suspenders. */
export async function getPublishedEssentialNumbers(): Promise<EssentialNumberRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("essential_numbers").select("*").eq("status", "published");
  if (error) {
    console.error("[getPublishedEssentialNumbers] failed:", error.message);
    return [];
  }
  return data ?? [];
}
