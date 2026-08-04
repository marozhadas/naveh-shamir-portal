import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

const BUCKET = "event-images";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadEventMediaResult = { success: true; url: string } | { success: false; reason: "not-configured" | "invalid-type" | "too-large" | "upload-failed" };

/** Admin-only surface (unlike business/marketplace media uploads) — caller (the events actions) always verifies isAdminAuthenticated() first. No SVG accepted, matching the explicit spec requirement. */
export async function uploadEventMedia(draftId: string, file: File): Promise<UploadEventMediaResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "not-configured" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { success: false, reason: "invalid-type" };
  if (file.size > MAX_FILE_SIZE_BYTES) return { success: false, reason: "too-large" };

  const admin = createAdminSupabaseClient();
  const extension = EXTENSION_BY_MIME[file.type];
  const path = `events/${draftId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("[uploadEventMedia] storage upload failed:", error.message);
    return { success: false, reason: "upload-failed" };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { success: true, url: publicUrl };
}

/** Best-effort cleanup — called only after a successful save that replaced/removed an image, never before (spec: "מחיקת קובץ ישן רק לאחר שמירה מוצלחת"). */
export async function deleteEventMediaByUrl(url: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  const path = url.slice(index + marker.length);
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("[deleteEventMediaByUrl] failed:", error.message);
}
