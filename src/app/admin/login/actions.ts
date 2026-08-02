"use server";

import { redirect } from "next/navigation";
import { checkAdminPassword, createAdminSession, getAdminId } from "@/lib/admin-session";
import { recordAuditLog } from "@/lib/admin/audit-log";

export type AdminLoginActionState = { error: string | null };

export async function adminLoginAction(_prevState: AdminLoginActionState, formData: FormData): Promise<AdminLoginActionState> {
  const password = formData.get("password");
  if (typeof password !== "string" || !checkAdminPassword(password)) {
    return { error: "סיסמה שגויה." };
  }
  await createAdminSession();
  await recordAuditLog({ adminId: getAdminId(), action: "admin-login" });
  redirect("/admin");
}
