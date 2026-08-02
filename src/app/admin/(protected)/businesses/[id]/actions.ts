"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { getRegistrationById, updateRegistrationStatus } from "@/lib/admin/business-registrations";
import { getNotificationById, resolveNotificationForEntity } from "@/lib/admin/notifications";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { sendRegistrationNotificationEmail } from "@/lib/email/send-registration-notification-email";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
}

function revalidateBusinessViews(registrationId: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
  revalidatePath("/admin/businesses/pending");
  revalidatePath(`/admin/businesses/${registrationId}`);
  revalidatePath("/admin/notifications");
  revalidatePath("/businesses");
}

/**
 * The Supabase JS client has no cross-table transaction API, so "atomic" here means: the
 * load-bearing write (the registration's status) happens first and is the one thing that defines
 * whether the business is live. If the secondary writes (closing the notification, the audit log
 * entry) fail afterward, the approval/rejection itself still stands rather than silently
 * reverting — a half-applied approval is a worse outcome than a notification staying open one
 * extra beat, and the error still surfaces to the admin either way.
 */
export async function approveRegistrationAction(registrationId: string): Promise<void> {
  const adminId = await requireAdmin();
  const registration = await getRegistrationById(registrationId);
  if (!registration) throw new Error("ההרשמה לא נמצאה.");

  await updateRegistrationStatus(registrationId, "approved");
  await resolveNotificationForEntity("business-registration", registrationId, adminId);
  await recordAuditLog({
    adminId,
    action: "business-approved",
    entityType: "business-registration",
    entityId: registrationId,
    metadata: { businessName: registration.business_name },
  });

  revalidateBusinessViews(registrationId);
}

export type RejectActionState = { error: string | null; success: boolean };

export async function rejectRegistrationAction(
  registrationId: string,
  _prevState: RejectActionState,
  formData: FormData,
): Promise<RejectActionState> {
  const reasonRaw = formData.get("reason");
  const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "";
  if (reason.length < 3) {
    return { error: "יש לפרט את סיבת הדחייה (לפחות 3 תווים).", success: false };
  }

  const adminId = await requireAdmin();
  const registration = await getRegistrationById(registrationId);
  if (!registration) return { error: "ההרשמה לא נמצאה.", success: false };

  await updateRegistrationStatus(registrationId, "rejected", { rejection_reason: reason });
  await resolveNotificationForEntity("business-registration", registrationId, adminId);
  await recordAuditLog({
    adminId,
    action: "business-rejected",
    entityType: "business-registration",
    entityId: registrationId,
    metadata: { businessName: registration.business_name, reason },
  });

  revalidateBusinessViews(registrationId);
  return { error: null, success: true };
}

const MAX_EMAIL_ATTEMPTS = 3;

export async function retryNotificationEmailAction(notificationId: string): Promise<void> {
  await requireAdmin();
  const notification = await getNotificationById(notificationId);
  if (!notification) throw new Error("ההתראה לא נמצאה.");
  if (notification.email_attempts >= MAX_EMAIL_ATTEMPTS) throw new Error("מוצו נסיונות שליחת המייל (3).");
  if (!notification.entity_id) throw new Error("לא ניתן לשלוח מייל עבור התראה זו.");

  const registration = await getRegistrationById(notification.entity_id);
  if (!registration) throw new Error("ההרשמה המקורית לא נמצאה.");

  await sendRegistrationNotificationEmail({
    notificationId: notification.id,
    registrationId: registration.id,
    businessName: registration.business_name,
    categoryId: registration.category_id,
    contactName: registration.contact_name,
    createdAt: registration.created_at,
  });

  const adminId = getAdminId();
  await recordAuditLog({
    adminId,
    action: "notification-email-retry",
    entityType: "business-registration",
    entityId: registration.id,
  });

  revalidatePath(`/admin/businesses/${registration.id}`);
  revalidatePath("/admin/notifications");
}
