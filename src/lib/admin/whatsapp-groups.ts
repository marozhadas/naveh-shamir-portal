import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { WhatsAppGroupRow, WhatsAppGroupStatus } from "@/types/whatsapp-group";

export async function listAllWhatsAppGroups(): Promise<WhatsAppGroupRow[]> {
  const supabase = createAdminSupabaseClient();
  // Secondary/tertiary sort keys are required, not cosmetic — see the identical comment (and the
  // reorder bug it fixed) in src/lib/admin/essential-numbers.ts: without a stable tiebreaker, two
  // rows tied on priority (e.g. a freshly duplicated group) can flip order between calls and
  // silently desync the client's index from the server's during a reorder.
  const { data, error } = await supabase
    .from("neighborhood_whatsapp_groups")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getWhatsAppGroupById(id: string): Promise<WhatsAppGroupRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("neighborhood_whatsapp_groups").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export type WhatsAppGroupInsertInput = Omit<WhatsAppGroupRow, "id" | "created_at" | "updated_at">;

export async function insertWhatsAppGroup(input: WhatsAppGroupInsertInput): Promise<WhatsAppGroupRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("neighborhood_whatsapp_groups").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export type WhatsAppGroupUpdateInput = Partial<Omit<WhatsAppGroupRow, "id" | "created_at">>;

export async function updateWhatsAppGroup(id: string, input: WhatsAppGroupUpdateInput): Promise<WhatsAppGroupRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("neighborhood_whatsapp_groups")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setWhatsAppGroupStatus(id: string, status: WhatsAppGroupStatus, updatedBy: string | null): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const extra: Partial<WhatsAppGroupRow> = { status, updated_at: new Date().toISOString(), updated_by: updatedBy };
  const { error } = await supabase.from("neighborhood_whatsapp_groups").update(extra).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setWhatsAppGroupPriority(id: string, priority: number, updatedBy: string | null): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("neighborhood_whatsapp_groups").update({ priority, updated_at: new Date().toISOString(), updated_by: updatedBy }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteWhatsAppGroup(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("neighborhood_whatsapp_groups").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
