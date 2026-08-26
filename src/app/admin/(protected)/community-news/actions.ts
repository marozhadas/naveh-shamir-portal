"use server";

import { revalidatePath } from "next/cache";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import {
  deleteCommunityNews,
  getCommunityNewsById,
  insertCommunityNews,
  isCommunityNewsSlugTaken,
  setCommunityNewsStatus,
  updateCommunityNews,
} from "@/lib/admin/community-news";
import { deleteCommunityNewsMediaByUrl, uploadCommunityNewsMedia } from "@/repositories/community-news-media-service";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { slugify } from "@/utils/slugify";
import { communityNewsFormSchema, type CommunityNewsFormValues } from "./schema";
import type { CommunityNewsRow, CommunityNewsStatus } from "@/types/community-news";

async function requireAdmin(): Promise<string> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase admin access is not configured.");
  return getAdminId();
}

function revalidateCommunityNewsViews(id?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/community-news");
  revalidatePath("/news");
  revalidatePath("/");
  if (id) revalidatePath(`/admin/community-news/${id}/edit`);
}

export type CommunityNewsSaveActionState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof CommunityNewsFormValues, string[]>>;
  values: CommunityNewsFormValues;
  savedArticle?: CommunityNewsRow;
};

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData): CommunityNewsFormValues {
  return {
    title: readField(formData, "title"),
    slug: readField(formData, "slug"),
    excerpt: readField(formData, "excerpt"),
    body: readField(formData, "body"),
  };
}

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשמור את הכתבה כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

/**
 * One action for both create and edit (id undefined -> insert, defined -> update), and both
 * "שמירת טיוטה"/"פרסום" (the submitting button's name="intent" value decides the resulting
 * status). Image URL/alt arrives already uploaded via uploadCommunityNewsImageAction — this
 * action never receives raw file bytes. Mirrors saveEventAction's shape exactly.
 */
export async function saveCommunityNewsAction(
  id: string | undefined,
  _prevState: CommunityNewsSaveActionState,
  formData: FormData,
): Promise<CommunityNewsSaveActionState> {
  const adminId = await requireAdmin();
  const raw = readFormValues(formData);
  const result = communityNewsFormSchema.safeParse(raw);

  if (!result.success) {
    return { status: "validation-error", message: "יש כמה פרטים שצריך לתקן", fieldErrors: result.error.flatten().fieldErrors, values: raw };
  }

  const values = result.data;
  const intent = readField(formData, "intent") === "publish" ? "publish" : "draft";
  const slug = values.slug ? slugify(values.slug) : slugify(values.title);

  if (await isCommunityNewsSlugTaken(slug, id)) {
    return {
      status: "validation-error",
      message: "יש כמה פרטים שצריך לתקן",
      fieldErrors: { slug: ["ה-Slug הזה כבר בשימוש — יש לבחור אחד ייחודי"] },
      values: raw,
    };
  }

  const imageUrl = readField(formData, "imageUrl");
  const imageAlt = readField(formData, "imageAlt");
  const previousImageUrl = readField(formData, "previousImageUrl");

  const status: CommunityNewsStatus = intent === "publish" ? "published" : "draft";

  const payload = {
    title: values.title,
    slug,
    excerpt: values.excerpt,
    body: values.body,
    image_url: imageUrl || null,
    image_alt: imageAlt || null,
    status,
    updated_by: adminId,
    published_at: null,
  };

  try {
    let saved: CommunityNewsRow;
    if (id) {
      saved = await updateCommunityNews(id, { ...payload, published_at: status === "published" ? new Date().toISOString() : undefined });
      await recordAuditLog({ adminId, action: "community-news-updated", entityType: "community-news", entityId: id, metadata: { title: values.title, status } });
    } else {
      saved = await insertCommunityNews({ ...payload, created_by: adminId, published_at: status === "published" ? new Date().toISOString() : null });
      await recordAuditLog({ adminId, action: "community-news-created", entityType: "community-news", entityId: saved.id, metadata: { title: values.title, status } });
    }

    if (previousImageUrl && previousImageUrl !== imageUrl) {
      await deleteCommunityNewsMediaByUrl(previousImageUrl);
    }

    revalidateCommunityNewsViews(saved.id);
    return { status: "success", values: raw, savedArticle: saved };
  } catch (error) {
    console.error("[saveCommunityNewsAction] failed:", error);
    return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
  }
}

export type UploadImageActionResult = { success: true; url: string } | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת תמונות אינה זמינה כרגע.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "התמונה גדולה מדי — עד 5MB.",
  "upload-failed": "העלאת התמונה נכשלה. נסו שוב.",
};

export async function uploadCommunityNewsImageAction(draftId: string, file: File): Promise<UploadImageActionResult> {
  await requireAdmin();
  const result = await uploadCommunityNewsMedia(draftId, file);
  if (!result.success) return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  return { success: true, url: result.url };
}

const STATUS_AUDIT_ACTION: Record<CommunityNewsStatus, "community-news-published" | "community-news-unpublished" | "community-news-archived"> = {
  published: "community-news-published",
  draft: "community-news-unpublished",
  archived: "community-news-archived",
};

export async function setCommunityNewsStatusAction(id: string, status: CommunityNewsStatus): Promise<void> {
  const adminId = await requireAdmin();
  const article = await getCommunityNewsById(id);
  if (!article) throw new Error("הכתבה לא נמצאה.");
  await setCommunityNewsStatus(id, status, adminId);
  await recordAuditLog({ adminId, action: STATUS_AUDIT_ACTION[status], entityType: "community-news", entityId: id, metadata: { title: article.title, status } });
  revalidateCommunityNewsViews(id);
}

export async function deleteCommunityNewsAction(id: string): Promise<void> {
  const adminId = await requireAdmin();
  const article = await getCommunityNewsById(id);
  if (!article) throw new Error("הכתבה לא נמצאה.");
  if (article.image_url) await deleteCommunityNewsMediaByUrl(article.image_url);
  await deleteCommunityNews(id);
  await recordAuditLog({ adminId, action: "community-news-deleted", entityType: "community-news", entityId: id, metadata: { title: article.title } });
  revalidateCommunityNewsViews();
}
