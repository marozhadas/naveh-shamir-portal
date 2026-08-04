import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { CommunityEventRow, EventStatus } from "@/types/community-event";

export async function listAllEvents(): Promise<CommunityEventRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countDraftEvents(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "draft");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getEventById(id: string): Promise<CommunityEventRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("events").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export type EventInsertInput = Omit<CommunityEventRow, "id" | "created_at" | "updated_at" | "display_order"> & { display_order?: number };

export async function insertEvent(input: EventInsertInput): Promise<CommunityEventRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("events").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export type EventUpdateInput = Partial<Omit<CommunityEventRow, "id" | "created_at">>;

export async function updateEvent(id: string, input: EventUpdateInput): Promise<CommunityEventRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setEventStatus(id: string, status: EventStatus, updatedBy: string | null): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const extra: Partial<CommunityEventRow> = { status, updated_at: new Date().toISOString(), updated_by: updatedBy };
  if (status === "published") extra.published_at = new Date().toISOString();
  const { error } = await supabase.from("events").update(extra).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
