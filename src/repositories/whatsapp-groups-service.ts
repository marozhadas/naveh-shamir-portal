import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { PUBLIC_WHATSAPP_GROUP_COLUMNS, toPublicWhatsAppGroupRow } from "@/lib/supabase/public-columns";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";

/** RLS restricts anon to status="published" rows already — the .eq() here is belt-and-suspenders. */
export async function getPublishedWhatsAppGroups(): Promise<WhatsAppGroupRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("neighborhood_whatsapp_groups").select(PUBLIC_WHATSAPP_GROUP_COLUMNS).eq("status", "published");
  if (error) {
    console.error("[getPublishedWhatsAppGroups] failed:", error.message);
    return [];
  }
  return (data ?? []).map(toPublicWhatsAppGroupRow);
}
