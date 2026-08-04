"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { deleteRegistration, getRegistrationById, updateRegistrationFields, updateRegistrationStatus } from "@/lib/admin/business-registrations";
import { getNotificationById, resolveNotificationForEntity } from "@/lib/admin/notifications";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { sendRegistrationNotificationEmail } from "@/lib/email/send-registration-notification-email";
import { deleteBusinessMediaByUrl, uploadBusinessMedia } from "@/repositories/business-media-service";
import { businessEditFormSchema, type BusinessEditFormValues } from "./schema";

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

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readEditFormValues(formData: FormData): BusinessEditFormValues {
  return {
    businessName: readField(formData, "businessName"),
    categoryId: readField(formData, "categoryId"),
    shortDescription: readField(formData, "shortDescription"),
    description: readField(formData, "description"),
    contactName: readField(formData, "contactName"),
    phone: readField(formData, "phone"),
    whatsappPhone: readField(formData, "whatsappPhone"),
    email: readField(formData, "email"),
    websiteUrl: readField(formData, "websiteUrl"),
    address: readField(formData, "address"),
    serviceArea: readField(formData, "serviceArea"),
    featured: formData.get("featured") === "on",
    verified: formData.get("verified") === "on",
  };
}

export type BusinessEditActionState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof BusinessEditFormValues, string[]>>;
  values: BusinessEditFormValues;
};

const GENERIC_EDIT_ERROR_MESSAGE = "לא הצלחנו לשמור את העדכון כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

export async function updateBusinessAction(
  registrationId: string,
  _prevState: BusinessEditActionState,
  formData: FormData,
): Promise<BusinessEditActionState> {
  const adminId = await requireAdmin();
  const raw = readEditFormValues(formData);
  const result = businessEditFormSchema.safeParse(raw);

  if (!result.success) {
    return { status: "validation-error", message: "יש כמה פרטים שצריך לתקן", fieldErrors: result.error.flatten().fieldErrors, values: raw };
  }

  const registration = await getRegistrationById(registrationId);
  if (!registration) return { status: "server-error", message: "העסק לא נמצא.", values: raw };

  const values = result.data;
  const imageUrl = readField(formData, "imageUrl");
  const imageAlt = readField(formData, "imageAlt");
  const previousImageUrl = readField(formData, "previousImageUrl");

  try {
    await updateRegistrationFields(registrationId, {
      business_name: values.businessName,
      category_id: values.categoryId,
      short_description: values.shortDescription || null,
      description: values.description,
      contact_name: values.contactName,
      phone: values.phone || null,
      whatsapp_phone: values.whatsappPhone || null,
      email: values.email || null,
      website_url: values.websiteUrl || null,
      address: values.address || null,
      service_area: values.serviceArea || null,
      featured: values.featured,
      verified: values.verified,
      cover_image: imageUrl ? { url: imageUrl, alt: imageAlt || values.businessName } : null,
    });

    await recordAuditLog({
      adminId,
      action: "business-updated",
      entityType: "business-registration",
      entityId: registrationId,
      metadata: { businessName: values.businessName },
    });

    if (previousImageUrl && previousImageUrl !== imageUrl) {
      await deleteBusinessMediaByUrl(previousImageUrl);
    }

    revalidateBusinessViews(registrationId);
    revalidatePath(`/admin/businesses/${registrationId}/edit`);
    if (registration.slug) revalidatePath(`/businesses/${registration.slug}`);
    return { status: "success", values: raw };
  } catch (error) {
    console.error("[updateBusinessAction] failed:", error);
    return { status: "server-error", message: GENERIC_EDIT_ERROR_MESSAGE, values: raw };
  }
}

export type UploadBusinessImageActionResult = { success: true; url: string } | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת תמונות אינה זמינה כרגע.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "התמונה גדולה מדי — עד 5MB.",
  "upload-failed": "העלאת התמונה נכשלה. נסו שוב.",
};

export async function uploadBusinessImageAction(registrationId: string, file: File): Promise<UploadBusinessImageActionResult> {
  await requireAdmin();
  const result = await uploadBusinessMedia(registrationId, "cover", file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

export async function deleteBusinessAction(registrationId: string): Promise<void> {
  const adminId = await requireAdmin();
  const registration = await getRegistrationById(registrationId);
  if (!registration) throw new Error("העסק לא נמצא.");

  if (registration.cover_image?.url) await deleteBusinessMediaByUrl(registration.cover_image.url);
  for (const image of registration.gallery ?? []) {
    if (image.url) await deleteBusinessMediaByUrl(image.url);
  }

  await deleteRegistration(registrationId);
  await recordAuditLog({
    adminId,
    action: "business-deleted",
    entityType: "business-registration",
    entityId: registrationId,
    metadata: { businessName: registration.business_name },
  });

  revalidateBusinessViews(registrationId);
}
