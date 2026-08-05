import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { EssentialNumberRow, EssentialNumberStatus } from "@/types/essential-number";

export async function listAllEssentialNumbers(): Promise<EssentialNumberRow[]> {
  const supabase = createAdminSupabaseClient();
  // Secondary/tertiary sort keys are required, not cosmetic: when two rows tie on priority
  // (e.g. a freshly duplicated entry defaults to priority 0, tying its source), Postgres's
  // tie-break order is otherwise unspecified and can vary between calls. moveEssentialNumberAction
  // relies on this list's index order being stable and reproducible to compute which neighbor to
  // swap with — an unstable order can silently desync it into a no-op.
  const { data, error } = await supabase
    .from("essential_numbers")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEssentialNumberById(id: string): Promise<EssentialNumberRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("essential_numbers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export type EssentialNumberInsertInput = Omit<EssentialNumberRow, "id" | "created_at" | "updated_at">;

export async function insertEssentialNumber(input: EssentialNumberInsertInput): Promise<EssentialNumberRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("essential_numbers").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export type EssentialNumberUpdateInput = Partial<Omit<EssentialNumberRow, "id" | "created_at">>;

export async function updateEssentialNumber(id: string, input: EssentialNumberUpdateInput): Promise<EssentialNumberRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("essential_numbers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setEssentialNumberStatus(id: string, status: EssentialNumberStatus, updatedBy: string | null): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const extra: Partial<EssentialNumberRow> = { status, updated_at: new Date().toISOString(), updated_by: updatedBy };
  const { error } = await supabase.from("essential_numbers").update(extra).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setEssentialNumberPriority(id: string, priority: number, updatedBy: string | null): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("essential_numbers").update({ priority, updated_at: new Date().toISOString(), updated_by: updatedBy }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEssentialNumber(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("essential_numbers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
