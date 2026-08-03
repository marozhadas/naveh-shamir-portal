import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

const BUCKET = "business-media";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadBusinessMediaResult =
  | { success: true; url: string }
  | { success: false; reason: "not-configured" | "invalid-type" | "too-large" | "upload-failed" };

/**
 * Public-facing (no admin gate) — a registrant filling out /business/register/plus isn't logged in
 * at all, so this can't require isAdminAuthenticated() the way hero-gallery uploads do. Safety
 * instead comes from: strict MIME/size validation, a random destination filename (never the
 * client's original name), and the service-role client only ever running here, server-side —
 * the browser never sees it (spec section 21/16: "Service Role רק בצד השרת").
 *
 * `registrationId` is a client-generated UUID (see PlusBusinessRegistrationInput) used purely as a
 * folder key so images uploaded before the registration row exists land in a stable, predictable
 * path that the eventual insert (same id) can reference.
 */
export async function uploadBusinessMedia(
  registrationId: string,
  kind: "cover" | "gallery",
  file: File,
): Promise<UploadBusinessMediaResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "not-configured" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { success: false, reason: "invalid-type" };
  if (file.size > MAX_FILE_SIZE_BYTES) return { success: false, reason: "too-large" };

  const admin = createAdminSupabaseClient();
  const extension = EXTENSION_BY_MIME[file.type];
  const path = `registrations/${registrationId}/${kind}/${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("[uploadBusinessMedia] storage upload failed:", error.message);
    return { success: false, reason: "upload-failed" };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { success: true, url: publicUrl };
}
