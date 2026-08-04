import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

const BUCKET = "marketplace-media";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadMarketplaceMediaResult =
  | { success: true; url: string }
  | { success: false; reason: "not-configured" | "invalid-type" | "too-large" | "upload-failed" };

/**
 * Public-facing (no admin gate) — same shape as uploadBusinessMedia: a visitor posting a listing
 * isn't logged in, so safety comes from strict MIME/size validation and a random destination
 * filename, not an auth check. The service-role client only ever runs here, server-side.
 * `draftId` is a client-generated UUID used purely as a folder key, stable before the listing
 * row itself exists.
 */
export async function uploadMarketplaceMedia(draftId: string, file: File): Promise<UploadMarketplaceMediaResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "not-configured" };
  if (!ALLOWED_MIME_TYPES.has(file.type)) return { success: false, reason: "invalid-type" };
  if (file.size > MAX_FILE_SIZE_BYTES) return { success: false, reason: "too-large" };

  const admin = createAdminSupabaseClient();
  const extension = EXTENSION_BY_MIME[file.type];
  const path = `listings/${draftId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.error("[uploadMarketplaceMedia] storage upload failed:", error.message);
    return { success: false, reason: "upload-failed" };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { success: true, url: publicUrl };
}
