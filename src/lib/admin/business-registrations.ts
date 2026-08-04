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

/** The fields an admin is allowed to correct after submission — never status/plan/consents/trial fields, which have their own dedicated, audited flows. */
export type BusinessRegistrationEditableFields = Partial<
  Pick<
    BusinessRegistrationRow,
    | "business_name"
    | "category_id"
    | "description"
    | "short_description"
    | "contact_name"
    | "phone"
    | "whatsapp_phone"
    | "email"
    | "website_url"
    | "address"
    | "service_area"
    | "featured"
    | "verified"
    | "cover_image"
  >
>;

export async function updateRegistrationFields(id: string, fields: BusinessRegistrationEditableFields): Promise<BusinessRegistrationRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("business_registrations").update(fields).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

/** FK constraints on subscriptions/events-log/notifications all cascade on delete; analytics rows keep their history with business_id set to null. */
export async function deleteRegistration(id: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("business_registrations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
