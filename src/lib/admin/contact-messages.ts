import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { ContactMessageRow, ContactMessageStatus } from "@/types/contact-message";

export async function listAllContactMessages(): Promise<ContactMessageRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getContactMessageById(id: string): Promise<ContactMessageRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("contact_messages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function setContactMessageStatus(id: string, status: ContactMessageStatus): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteContactMessage(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function countNewContactMessages(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "new");
  if (error) throw new Error(error.message);
  return count ?? 0;
}
