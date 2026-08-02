"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { saveAdminNotificationPreferences } from "@/lib/admin/preferences";
import { recordAuditLog } from "@/lib/admin/audit-log";
import type { AdminNotificationPreferences } from "@/types/admin-notification";

export type SavePreferencesActionState = { error: string | null; success: boolean };

export async function savePreferencesAction(
  _prevState: SavePreferencesActionState,
  formData: FormData,
): Promise<SavePreferencesActionState> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  const adminId = getAdminId();

  const emailAddressRaw = formData.get("emailAddress");
  const emailAddress = typeof emailAddressRaw === "string" ? emailAddressRaw.trim() : "";
  if (emailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
    return { error: "כתובת האימייל אינה תקינה.", success: false };
  }

  const preferences: AdminNotificationPreferences = {
    soundEnabled: formData.get("soundEnabled") === "on",
    emailEnabled: formData.get("emailEnabled") === "on",
    emailAddress: emailAddress || null,
    notificationTypes: {
      businessRegistration: formData.get("businessRegistration") === "on",
      businessProfileUpdated: formData.get("businessProfileUpdated") === "on",
      subscriptionExpiring: formData.get("subscriptionExpiring") === "on",
      paymentFailed: formData.get("paymentFailed") === "on",
      contactMessage: formData.get("contactMessage") === "on",
    },
  };

  await saveAdminNotificationPreferences(adminId, preferences);
  await recordAuditLog({ adminId, action: "notification-preferences-updated" });

  revalidatePath("/admin/settings/notifications");
  revalidatePath("/admin");

  return { error: null, success: true };
}
