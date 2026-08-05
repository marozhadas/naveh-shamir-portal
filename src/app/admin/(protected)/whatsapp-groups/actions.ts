"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import {
  deleteWhatsAppGroup,
  getWhatsAppGroupById,
  insertWhatsAppGroup,
  listAllWhatsAppGroups,
  setWhatsAppGroupPriority,
  setWhatsAppGroupStatus,
  updateWhatsAppGroup,
} from "@/lib/admin/whatsapp-groups";
import { deleteWhatsAppGroupIconByUrl, uploadWhatsAppGroupIcon } from "@/repositories/whatsapp-group-icon-service";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { whatsAppGroupFormSchema, parseAudienceInput, type WhatsAppGroupFormValues } from "./schema";
import type { WhatsAppGroupCategory, WhatsAppGroupIconType, WhatsAppGroupRow, WhatsAppGroupStatus } from "@/types/whatsapp-group";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
}

function revalidateWhatsAppGroupViews(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/whatsapp-groups");
  revalidatePath("/essential-numbers");
  revalidatePath("/");
  if (id) revalidatePath(`/admin/whatsapp-groups/${id}/edit`);
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData): WhatsAppGroupFormValues {
  return {
    name: readField(formData, "name"),
    description: readField(formData, "description"),
    category: readField(formData, "category"),
    inviteUrl: readField(formData, "inviteUrl"),
    audience: readField(formData, "audience"),
    areaOrStreet: readField(formData, "areaOrStreet"),
    iconType: (readField(formData, "iconType") as WhatsAppGroupFormValues["iconType"]) || "whatsapp",
    iconName: readField(formData, "iconName"),
    iconAlt: readField(formData, "iconAlt"),
    rulesOrNotes: readField(formData, "rulesOrNotes"),
    adminContactName: readField(formData, "adminContactName"),
    priority: readField(formData, "priority") || "0",
    featured: formData.get("featured") === "on",
  };
}

export type WhatsAppGroupSaveActionState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof WhatsAppGroupFormValues, string[]>>;
  values: WhatsAppGroupFormValues;
  savedGroup?: WhatsAppGroupRow;
};

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשמור את הקבוצה כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

/**
 * One action for both create and edit (id undefined -> insert, defined -> update), and both
 * "שמירת טיוטה"/"פרסום" (the submitting button's name="intent" value decides the resulting
 * status). Icon URL/alt for a custom image arrives already uploaded via
 * uploadWhatsAppGroupIconAction — this action never receives raw file bytes.
 */
export async function saveWhatsAppGroupAction(
  id: string | undefined,
  _prevState: WhatsAppGroupSaveActionState,
  formData: FormData,
): Promise<WhatsAppGroupSaveActionState> {
  const adminId = await requireAdmin();
  const raw = readFormValues(formData);
  const result = whatsAppGroupFormSchema.safeParse(raw);

  if (!result.success) {
    return { status: "validation-error", message: "יש כמה פרטים שצריך לתקן", fieldErrors: result.error.flatten().fieldErrors, values: raw };
  }

  const values = result.data;
  const intent = readField(formData, "intent") === "publish" ? "publish" : "draft";
  const status: WhatsAppGroupStatus = intent === "publish" ? "published" : "draft";

  const iconUrl = readField(formData, "iconUrl");
  const previousIconUrl = readField(formData, "previousIconUrl");

  const payload = {
    name: values.name,
    description: values.description || null,
    invite_url: values.inviteUrl,
    category: values.category as WhatsAppGroupCategory,
    audience: parseAudienceInput(values.audience),
    area_or_street: values.areaOrStreet || null,
    icon_type: values.iconType as WhatsAppGroupIconType,
    icon_name: values.iconType === "lucide" ? values.iconName || null : null,
    icon_url: values.iconType === "custom-image" ? iconUrl || null : null,
    icon_alt: values.iconType === "custom-image" ? values.iconAlt || null : null,
    rules_or_notes: values.rulesOrNotes || null,
    admin_contact_name: values.adminContactName || null,
    priority: Number(values.priority) || 0,
    featured: values.featured,
    status,
    updated_by: adminId,
  };

  try {
    let saved: WhatsAppGroupRow;
    if (id) {
      saved = await updateWhatsAppGroup(id, payload);
      await recordAuditLog({ adminId, action: "whatsapp-group-updated", entityType: "whatsapp-group", entityId: id, metadata: { name: values.name, status } });
    } else {
      saved = await insertWhatsAppGroup({ ...payload, created_by: adminId });
      await recordAuditLog({ adminId, action: "whatsapp-group-created", entityType: "whatsapp-group", entityId: saved.id, metadata: { name: values.name, status } });
    }

    if (previousIconUrl && previousIconUrl !== iconUrl) {
      await deleteWhatsAppGroupIconByUrl(previousIconUrl);
    }

    revalidateWhatsAppGroupViews(saved.id);
    return { status: "success", values: raw, savedGroup: saved };
  } catch (error) {
    console.error("[saveWhatsAppGroupAction] failed:", error);
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

export async function uploadWhatsAppGroupIconAction(draftId: string, file: File): Promise<UploadIconActionResult> {
  await requireAdmin();
  const result = await uploadWhatsAppGroupIcon(draftId, file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

const STATUS_AUDIT_ACTION: Record<WhatsAppGroupStatus, "whatsapp-group-published" | "whatsapp-group-unpublished" | "whatsapp-group-archived"> = {
  published: "whatsapp-group-published",
  draft: "whatsapp-group-unpublished",
  archived: "whatsapp-group-archived",
};

export async function setWhatsAppGroupStatusAction(id: string, status: WhatsAppGroupStatus): Promise<void> {
  const adminId = await requireAdmin();
  const entry = await getWhatsAppGroupById(id);
  if (!entry) throw new Error("הקבוצה לא נמצאה.");
  await setWhatsAppGroupStatus(id, status, adminId);
  await recordAuditLog({ adminId, action: STATUS_AUDIT_ACTION[status], entityType: "whatsapp-group", entityId: id, metadata: { name: entry.name, status } });
  revalidateWhatsAppGroupViews(id);
}

export async function deleteWhatsAppGroupAction(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const entry = await getWhatsAppGroupById(id);
  if (!entry) throw new Error("הקבוצה לא נמצאה.");
  if (entry.icon_type === "custom-image" && entry.icon_url) await deleteWhatsAppGroupIconByUrl(entry.icon_url);
  await deleteWhatsAppGroup(id);
  await recordAuditLog({ adminId, action: "whatsapp-group-deleted", entityType: "whatsapp-group", entityId: id, metadata: { name: entry.name } });
  revalidateWhatsAppGroupViews();
}

export async function duplicateWhatsAppGroupAction(id: string): Promise<WhatsAppGroupRow> {
  const adminId = await requireAdmin();
  const source = await getWhatsAppGroupById(id);
  if (!source) throw new Error("הקבוצה לא נמצאה.");

  const duplicate = await insertWhatsAppGroup({
    name: `${source.name} (עותק)`,
    description: source.description,
    invite_url: source.invite_url,
    category: source.category,
    audience: source.audience,
    area_or_street: source.area_or_street,
    icon_type: source.icon_type,
    icon_name: source.icon_name,
    icon_url: source.icon_url,
    icon_alt: source.icon_alt,
    rules_or_notes: source.rules_or_notes,
    admin_contact_name: source.admin_contact_name,
    priority: source.priority,
    featured: false,
    status: "draft",
    created_by: adminId,
    updated_by: adminId,
  });

  await recordAuditLog({ adminId, action: "whatsapp-group-duplicated", entityType: "whatsapp-group", entityId: duplicate.id, metadata: { sourceId: id, name: duplicate.name } });
  revalidateWhatsAppGroupViews();
  return duplicate;
}

export async function moveWhatsAppGroupAction(id: string, direction: "up" | "down"): Promise<void> {
  const adminId = await requireAdmin();
  const all = await listAllWhatsAppGroups();
  const index = all.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= all.length) return;

  const current = all[index];
  const neighbor = all[swapIndex];
  await setWhatsAppGroupPriority(current.id, neighbor.priority, adminId);
  await setWhatsAppGroupPriority(neighbor.id, current.priority, adminId);
  await recordAuditLog({ adminId, action: "whatsapp-group-reordered", entityType: "whatsapp-group", entityId: id, metadata: { name: current.name, direction } });
  revalidateWhatsAppGroupViews();
}
