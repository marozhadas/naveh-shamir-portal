import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";

/** RLS restricts anon to status="published" rows already — the .eq() here is belt-and-suspenders. */
export async function getPublishedWhatsAppGroups(): Promise<WhatsAppGroupRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("neighborhood_whatsapp_groups").select("*").eq("status", "published");
  if (error) {
    console.error("[getPublishedWhatsAppGroups] failed:", error.message);
    return [];
  }
  return data ?? [];
}
