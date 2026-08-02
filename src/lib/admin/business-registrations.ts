import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { BusinessRegistrationRow, BusinessRegistrationStatus } from "@/types/business-registration";

export async function listAllRegistrations(): Promise<BusinessRegistrationRow[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("business_registrations").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPendingRegistrations(limit?: number): Promise<BusinessRegistrationRow[]> {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("business_registrations").select("*").eq("status", "pending").order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countPendingRegistrations(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase.from("business_registrations").select("*", { count: "exact", head: true }).eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countApprovedRegistrations(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase.from("business_registrations").select("*", { count: "exact", head: true }).eq("status", "approved");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getRegistrationById(id: string): Promise<BusinessRegistrationRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("business_registrations").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateRegistrationStatus(
  id: string,
  status: BusinessRegistrationStatus,
  extra: { rejection_reason?: string | null } = {},
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("business_registrations")
    .update({ status, reviewed_at: new Date().toISOString(), ...extra })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
