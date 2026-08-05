"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { deleteContactMessage, getContactMessageById, setContactMessageStatus } from "@/lib/admin/contact-messages";
import { resolveNotificationForEntity } from "@/lib/admin/notifications";
import { recordAuditLog } from "@/lib/admin/audit-log";
import type { ContactMessageStatus } from "@/types/contact-message";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
}

function revalidateContactViews(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/contact");
  if (id) revalidatePath(`/admin/contact/${id}`);
}

export async function setContactMessageStatusAction(id: string, status: ContactMessageStatus): Promise<void> {
  const adminId = await requireAdmin();
  const entry = await getContactMessageById(id);
  if (!entry) throw new Error("הפנייה לא נמצאה.");

  await setContactMessageStatus(id, status);
  // Any status change away from "new" is the admin acting on the message — clears its open bell entry.
  if (status !== "new") await resolveNotificationForEntity("contact-message", id, adminId);
  await recordAuditLog({
    adminId,
    action: "contact-message-status-updated",
    entityType: "contact-message",
    entityId: id,
    metadata: { fullName: entry.full_name, previousStatus: entry.status, newStatus: status },
  });
  revalidateContactViews(id);
}

export async function deleteContactMessageAction(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const entry = await getContactMessageById(id);
  if (!entry) throw new Error("הפנייה לא נמצאה.");

  await deleteContactMessage(id);
  await recordAuditLog({ adminId, action: "contact-message-deleted", entityType: "contact-message", entityId: id, metadata: { fullName: entry.full_name } });
  revalidateContactViews();
}
