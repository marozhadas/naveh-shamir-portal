"use server";

import { revalidatePath } from "next/cache";
import { checkAdminPassword, createAdminSession, destroyAdminSession, isAdminAuthenticated } from "@/lib/admin-session";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import type { BusinessRegistrationStatus } from "@/types/business-registration";

export type AdminLoginActionState = { error: string | null };

export async function adminLoginAction(_prevState: AdminLoginActionState, formData: FormData): Promise<AdminLoginActionState> {
  const password = formData.get("password");
  if (typeof password !== "string" || !checkAdminPassword(password)) {
    return { error: "סיסמה שגויה." };
  }
  await createAdminSession();
  revalidatePath("/admin");
  return { error: null };
}

export async function adminLogoutAction(): Promise<void> {
  await destroyAdminSession();
  revalidatePath("/admin");
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
}

async function setRegistrationStatus(registrationId: string, status: BusinessRegistrationStatus): Promise<void> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("business_registrations")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", registrationId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/businesses");
}

export async function approveRegistrationAction(registrationId: string): Promise<void> {
  await setRegistrationStatus(registrationId, "approved");
}

export async function rejectRegistrationAction(registrationId: string): Promise<void> {
  await setRegistrationStatus(registrationId, "rejected");
}

export async function resetToPendingAction(registrationId: string): Promise<void> {
  await setRegistrationStatus(registrationId, "pending");
}
