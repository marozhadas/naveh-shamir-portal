import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { CommunityNewsRow, CommunityNewsStatus } from "@/types/community-news";

export async function listAllCommunityNews(): Promise<CommunityNewsRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("community_news").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countDraftCommunityNews(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase.from("community_news").select("*", { count: "exact", head: true }).eq("status", "draft");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getCommunityNewsById(id: string): Promise<CommunityNewsRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("community_news").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function isCommunityNewsSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("community_news").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export type CommunityNewsInsertInput = Omit<CommunityNewsRow, "id" | "created_at" | "updated_at" | "display_order"> & { display_order?: number };

export async function insertCommunityNews(input: CommunityNewsInsertInput): Promise<CommunityNewsRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("community_news").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export type CommunityNewsUpdateInput = Partial<Omit<CommunityNewsRow, "id" | "created_at">>;

export async function updateCommunityNews(id: string, input: CommunityNewsUpdateInput): Promise<CommunityNewsRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("community_news")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setCommunityNewsStatus(id: string, status: CommunityNewsStatus, updatedBy: string | null): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const extra: Partial<CommunityNewsRow> = { status, updated_at: new Date().toISOString(), updated_by: updatedBy };
  if (status === "published") extra.published_at = new Date().toISOString();
  const { error } = await supabase.from("community_news").update(extra).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCommunityNews(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("community_news").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
