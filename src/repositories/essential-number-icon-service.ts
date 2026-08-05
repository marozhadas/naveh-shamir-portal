import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

const BUCKET = "essential-number-icons";
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
// Raster only, no SVG — an uploaded SVG would either need to be sanitized before ever reaching
// the DOM or rendered inert as a plain <img> (spec: never dangerouslySetInnerHTML an unsanitized
// SVG). Restricting to raster formats sidesteps that whole risk surface entirely, matching every
// other upload path in this codebase (marketplace/event/business images are all jpg/png/webp-only).
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadEssentialNumberIconResult = { success: true; url: string } | { success: false; reason: "not-configured" | "invalid-type" | "too-large" | "upload-failed" };

/** Admin-only — caller always verifies isAdminAuthenticated() first. */
export async function uploadEssentialNumberIcon(draftId: string, file: File): Promise<UploadEssentialNumberIconResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "not-configured" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { success: false, reason: "invalid-type" };
  if (file.size > MAX_FILE_SIZE_BYTES) return { success: false, reason: "too-large" };

  const admin = createAdminSupabaseClient();
  const extension = EXTENSION_BY_MIME[file.type];
  const path = `icons/${draftId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("[uploadEssentialNumberIcon] storage upload failed:", error.message);
    return { success: false, reason: "upload-failed" };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { success: true, url: publicUrl };
}

/** Best-effort cleanup — called only after a successful save that replaced/removed an icon. */
export async function deleteEssentialNumberIconByUrl(url: string): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  const path = url.slice(index + marker.length);
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("[deleteEssentialNumberIconByUrl] failed:", error.message);
}
