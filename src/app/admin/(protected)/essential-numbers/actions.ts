"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import {
  deleteEssentialNumber,
  getEssentialNumberById,
  insertEssentialNumber,
  listAllEssentialNumbers,
  setEssentialNumberPriority,
  setEssentialNumberStatus,
  updateEssentialNumber,
} from "@/lib/admin/essential-numbers";
import { deleteEssentialNumberIconByUrl, uploadEssentialNumberIcon } from "@/repositories/essential-number-icon-service";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { essentialNumberFormSchema, type EssentialNumberFormValues } from "./schema";
import type { EssentialNumberCategory, EssentialNumberIconTone, EssentialNumberRow, EssentialNumberStatus } from "@/types/essential-number";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
}

function revalidateEssentialNumberViews(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/essential-numbers");
  revalidatePath("/essential-numbers");
  revalidatePath("/");
  if (id) revalidatePath(`/admin/essential-numbers/${id}/edit`);
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData): EssentialNumberFormValues {
  return {
    name: readField(formData, "name"),
    description: readField(formData, "description"),
    category: readField(formData, "category"),
    phone: readField(formData, "phone"),
    displayPhone: readField(formData, "displayPhone"),
    whatsapp: readField(formData, "whatsapp"),
    websiteUrl: readField(formData, "websiteUrl"),
    iconType: readField(formData, "iconType") === "custom-image" ? "custom-image" : "lucide",
    iconName: readField(formData, "iconName"),
    iconAlt: readField(formData, "iconAlt"),
    iconTone: readField(formData, "iconTone") || "blue",
    openingHours: readField(formData, "openingHours"),
    notes: readField(formData, "notes"),
    priority: readField(formData, "priority") || "0",
    featured: formData.get("featured") === "on",
  };
}

export type EssentialNumberSaveActionState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof EssentialNumberFormValues, string[]>>;
  values: EssentialNumberFormValues;
  savedEntry?: EssentialNumberRow;
};

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשמור את המספר כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

/**
 * One action for both create and edit (id undefined -> insert, defined -> update), and both
 * "שמירת טיוטה"/"פרסום" (the submitting button's name="intent" value decides the resulting
 * status). Icon URL/alt for a custom image arrives already uploaded via
 * uploadEssentialNumberIconAction — this action never receives raw file bytes.
 */
export async function saveEssentialNumberAction(
  id: string | undefined,
  _prevState: EssentialNumberSaveActionState,
  formData: FormData,
): Promise<EssentialNumberSaveActionState> {
  const adminId = await requireAdmin();
  const raw = readFormValues(formData);
  const result = essentialNumberFormSchema.safeParse(raw);

  if (!result.success) {
    return { status: "validation-error", message: "יש כמה פרטים שצריך לתקן", fieldErrors: result.error.flatten().fieldErrors, values: raw };
  }

  const values = result.data;
  const intent = readField(formData, "intent") === "publish" ? "publish" : "draft";
  const status: EssentialNumberStatus = intent === "publish" ? "published" : "draft";

  const iconUrl = readField(formData, "iconUrl");
  const previousIconUrl = readField(formData, "previousIconUrl");

  const payload = {
    name: values.name,
    description: values.description || null,
    phone: values.phone,
    display_phone: values.displayPhone,
    whatsapp: values.whatsapp || null,
    website_url: values.websiteUrl || null,
    category: values.category as EssentialNumberCategory,
    icon_type: values.iconType,
    icon_name: values.iconType === "lucide" ? values.iconName || null : null,
    icon_url: values.iconType === "custom-image" ? iconUrl || null : null,
    icon_alt: values.iconType === "custom-image" ? values.iconAlt || null : null,
    icon_tone: values.iconTone as EssentialNumberIconTone,
    opening_hours: values.openingHours || null,
    notes: values.notes || null,
    priority: Number(values.priority) || 0,
    featured: values.featured,
    status,
    updated_by: adminId,
  };

  try {
    let saved: EssentialNumberRow;
    if (id) {
      saved = await updateEssentialNumber(id, payload);
      await recordAuditLog({ adminId, action: "essential-number-updated", entityType: "essential-number", entityId: id, metadata: { name: values.name, status } });
    } else {
      saved = await insertEssentialNumber({ ...payload, created_by: adminId });
      await recordAuditLog({ adminId, action: "essential-number-created", entityType: "essential-number", entityId: saved.id, metadata: { name: values.name, status } });
    }

    // Covers both "replaced the custom image with a new upload" and "switched away from
    // custom-image entirely" (the client clears the iconUrl hidden field in that case too).
    if (previousIconUrl && previousIconUrl !== iconUrl) {
      await deleteEssentialNumberIconByUrl(previousIconUrl);
    }

    revalidateEssentialNumberViews(saved.id);
    return { status: "success", values: raw, savedEntry: saved };
  } catch (error) {
    console.error("[saveEssentialNumberAction] failed:", error);
    return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
  }
}

export type UploadIconActionResult = { success: true; url: string } | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת אייקונים אינה זמינה כרגע.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "הקובץ גדול מדי — עד 2MB.",
  "upload-failed": "העלאת האייקון נכשלה. נסו שוב.",
};

export async function uploadEssentialNumberIconAction(draftId: string, file: File): Promise<UploadIconActionResult> {
  await requireAdmin();
  const result = await uploadEssentialNumberIcon(draftId, file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

const STATUS_AUDIT_ACTION: Record<EssentialNumberStatus, "essential-number-published" | "essential-number-unpublished" | "essential-number-archived"> = {
  published: "essential-number-published",
  draft: "essential-number-unpublished",
  archived: "essential-number-archived",
};

export async function setEssentialNumberStatusAction(id: string, status: EssentialNumberStatus): Promise<void> {
  const adminId = await requireAdmin();
  const entry = await getEssentialNumberById(id);
  if (!entry) throw new Error("המספר לא נמצא.");
  await setEssentialNumberStatus(id, status, adminId);
  await recordAuditLog({ adminId, action: STATUS_AUDIT_ACTION[status], entityType: "essential-number", entityId: id, metadata: { name: entry.name, status } });
  revalidateEssentialNumberViews(id);
}

export async function deleteEssentialNumberAction(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const entry = await getEssentialNumberById(id);
  if (!entry) throw new Error("המספר לא נמצא.");
  if (entry.icon_type === "custom-image" && entry.icon_url) await deleteEssentialNumberIconByUrl(entry.icon_url);
  await deleteEssentialNumber(id);
  await recordAuditLog({ adminId, action: "essential-number-deleted", entityType: "essential-number", entityId: id, metadata: { name: entry.name } });
  revalidateEssentialNumberViews();
}

export async function duplicateEssentialNumberAction(id: string): Promise<EssentialNumberRow> {
  const adminId = await requireAdmin();
  const source = await getEssentialNumberById(id);
  if (!source) throw new Error("המספר לא נמצא.");

  const duplicate = await insertEssentialNumber({
    name: `${source.name} (עותק)`,
    description: source.description,
    phone: source.phone,
    display_phone: source.display_phone,
    whatsapp: source.whatsapp,
    website_url: source.website_url,
    category: source.category,
    icon_type: source.icon_type,
    icon_name: source.icon_name,
    icon_url: source.icon_url,
    icon_alt: source.icon_alt,
    icon_tone: source.icon_tone,
    opening_hours: source.opening_hours,
    notes: source.notes,
    priority: source.priority,
    featured: false,
    status: "draft",
    created_by: adminId,
    updated_by: adminId,
  });

  await recordAuditLog({ adminId, action: "essential-number-duplicated", entityType: "essential-number", entityId: duplicate.id, metadata: { sourceId: id, name: duplicate.name } });
  revalidateEssentialNumberViews();
  return duplicate;
}

export async function moveEssentialNumberAction(id: string, direction: "up" | "down"): Promise<void> {
  const adminId = await requireAdmin();
  const all = await listAllEssentialNumbers();
  const index = all.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= all.length) return;

  const current = all[index];
  const neighbor = all[swapIndex];
  await setEssentialNumberPriority(current.id, neighbor.priority, adminId);
  await setEssentialNumberPriority(neighbor.id, current.priority, adminId);
  await recordAuditLog({ adminId, action: "essential-number-reordered", entityType: "essential-number", entityId: id, metadata: { name: current.name, direction } });
  revalidateEssentialNumberViews();
}
