import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { PUBLIC_ESSENTIAL_NUMBER_COLUMNS, toPublicEssentialNumberRow } from "@/lib/supabase/public-columns";
import type { EssentialNumberRow } from "@/types/essential-number";

/** RLS restricts anon to status="published" rows already — the .eq() here is belt-and-suspenders. */
export async function getPublishedEssentialNumbers(): Promise<EssentialNumberRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("essential_numbers").select(PUBLIC_ESSENTIAL_NUMBER_COLUMNS).eq("status", "published");
  if (error) {
    console.error("[getPublishedEssentialNumbers] failed:", error.message);
    return [];
  }
  return (data ?? []).map(toPublicEssentialNumberRow);
}
