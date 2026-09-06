"use server";

import { revalidatePath } from "next/cache";
import { getManagedBusinessByToken, updateManagedBusinessFields } from "@/repositories/business-management-service";
import { deleteBusinessMediaByUrl, uploadBusinessMedia } from "@/repositories/business-media-service";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";
import { businessManagementEditSchema } from "./schema";
import type { BusinessManagementEditValues } from "./schema";

const UPDATE_RATE_LIMIT_MAX = 20;
const UPDATE_RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes

const GENERIC_ERROR_MESSAGE = "לא הצלחנו לשמור את העדכון כרגע. אפשר לנסות שוב בעוד רגע.";
// Deliberately the exact same message for "wrong/expired token" and "no longer eligible" — telling
// them apart would let someone probing a stale/guessed token learn something about a business's
// current plan/approval state that they otherwise couldn't.
const INVALID_LINK_MESSAGE = "הקישור אינו תקין, פג תוקפו, או שאין יותר גישה לעריכה עצמית דרכו.";

export type UpdateManagedBusinessState =
  | { status: "validation-error"; message: string; fieldErrors: Record<string, string[]> }
  | { status: "invalid-link"; message: string }
  | { status: "server-error"; message: string }
  | { status: "success" };

export async function updateManagedBusinessFieldsAction(rawToken: string, values: BusinessManagementEditValues): Promise<UpdateManagedBusinessState> {
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`business-manage-update:${ip}`, UPDATE_RATE_LIMIT_MAX, UPDATE_RATE_LIMIT_WINDOW_SECONDS);
  if (!allowed) return { status: "invalid-link", message: INVALID_LINK_MESSAGE };

  const parsed = businessManagementEditSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "validation-error", message: "יש כמה פרטים שצריך לתקן", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let result;
  try {
    result = await updateManagedBusinessFields(rawToken, parsed.data);
  } catch (error) {
    console.error("[updateManagedBusinessFieldsAction] update failed:", error);
    return { status: "server-error", message: GENERIC_ERROR_MESSAGE };
  }
  if (!result.success) {
    return { status: "invalid-link", message: INVALID_LINK_MESSAGE };
  }

  try {
    await recordAuditLog({
      adminId: null,
      action: "business-management-link-edit",
      entityType: "business-registration",
      entityId: result.registration.id,
      metadata: { source: "management-link", businessName: result.registration.business_name },
    });
  } catch (error) {
    console.error("[updateManagedBusinessFieldsAction] audit log failed:", error);
  }

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${result.registration.slug}`);
  revalidatePath(`/admin/businesses/${result.registration.id}`);

  return { status: "success" };
}

export type UploadManagedBusinessMediaState = { success: true; url: string } | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת תמונות אינה זמינה כרגע. נסו שוב מאוחר יותר.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "התמונה גדולה מדי — עד 5MB לתמונה.",
  "upload-failed": "העלאת התמונה נכשלה. נסו שוב.",
};

/** Resolves the business by token first (never trusts a client-supplied id) so an expired/guessed token can't be used to write into Storage under an arbitrary registration folder. */
export async function uploadManagedBusinessMediaAction(rawToken: string, kind: "cover" | "gallery", formData: FormData): Promise<UploadManagedBusinessMediaState> {
  const registration = await getManagedBusinessByToken(rawToken);
  if (!registration) return { success: false, message: INVALID_LINK_MESSAGE };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "לא נבחר קובץ." };

  const result = await uploadBusinessMedia(registration.id, kind, file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

/** Best-effort cleanup after the form replaces/removes an image it previously uploaded — resolves the business by token first, same reasoning as the upload action above. */
export async function deleteManagedBusinessMediaAction(rawToken: string, url: string): Promise<void> {
  const registration = await getManagedBusinessByToken(rawToken);
  if (!registration) return;
  await deleteBusinessMediaByUrl(url);
}
