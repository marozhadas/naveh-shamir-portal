import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import type { HeroGalleryImage, HeroGalleryImageRow } from "@/types/hero-gallery";

const BUCKET = "hero-gallery";

function mapRow(row: HeroGalleryImageRow): HeroGalleryImage {
  return { id: row.id, url: row.public_url, alt: row.alt_text, order: row.display_order };
}

/**
 * Read-only and public on purpose — every site visitor's homepage render needs this list (spec:
 * the rotating gallery must be live for everyone, not just the editing admin's browser), so it
 * goes through the anon/publishable client like any other public content read in this codebase.
 * Never throws: if Supabase is briefly unreachable, the Hero just falls back to its static image.
 */
export async function listHeroGalleryImages(): Promise<HeroGalleryImage[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("hero_gallery_images").select("*").order("display_order", { ascending: true });
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

export type UploadHeroGalleryImageResult =
  | { success: true; image: HeroGalleryImage }
  | { success: false; reason: "not-configured" | "upload-failed" | "insert-failed" };

/**
 * Admin-only — the caller (uploadHeroGalleryImageAction) is responsible for verifying
 * isAdminAuthenticated() before this ever runs; this function itself just does the write using
 * the service-role client, which bypasses RLS entirely (matches every other admin-write path in
 * this codebase).
 */
export async function uploadHeroGalleryImage(file: File, altText: string): Promise<UploadHeroGalleryImageResult> {
  if (!isSupabaseAdminConfigured()) return { success: false, reason: "not-configured" };
  const admin = createAdminSupabaseClient();

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `hero/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    console.error("[uploadHeroGalleryImage] storage upload failed:", uploadError.message);
    return { success: false, reason: "upload-failed" };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  const { count } = await admin.from("hero_gallery_images").select("*", { count: "exact", head: true });
  const nextOrder = count ?? 0;

  const { data, error: insertError } = await admin
    .from("hero_gallery_images")
    .insert({ storage_path: path, public_url: publicUrl, alt_text: altText, display_order: nextOrder })
    .select()
    .single();

  if (insertError || !data) {
    console.error("[uploadHeroGalleryImage] db insert failed:", insertError?.message);
    // Best-effort cleanup so a failed insert doesn't leave an orphaned file in storage.
    await admin.storage.from(BUCKET).remove([path]);
    return { success: false, reason: "insert-failed" };
  }

  return { success: true, image: mapRow(data) };
}

/** Admin-only, same caller-verifies-auth contract as uploadHeroGalleryImage. Deletes the DB row first — an orphaned storage file is a harmless cleanup detail, an orphaned DB row pointing at a missing file is a broken image on the live site. */
export async function removeHeroGalleryImage(imageId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const admin = createAdminSupabaseClient();

  const { data: existing, error: fetchError } = await admin
    .from("hero_gallery_images")
    .select("storage_path")
    .eq("id", imageId)
    .maybeSingle();
  if (fetchError || !existing) return false;

  const { error: deleteError } = await admin.from("hero_gallery_images").delete().eq("id", imageId);
  if (deleteError) {
    console.error("[removeHeroGalleryImage] db delete failed:", deleteError.message);
    return false;
  }

  const { error: storageError } = await admin.storage.from(BUCKET).remove([existing.storage_path]);
  if (storageError) console.error("[removeHeroGalleryImage] storage remove failed:", storageError.message);

  return true;
}
