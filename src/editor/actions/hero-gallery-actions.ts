"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { listHeroGalleryImages, removeHeroGalleryImage, uploadHeroGalleryImage } from "@/repositories/hero-gallery-service";
import type { HeroGalleryImage } from "@/types/hero-gallery";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadHeroGalleryImageState = { status: "idle" | "success" | "error"; message?: string };

/** Only the already-admin-gated floating editor calls this, but every check is re-verified here server-side anyway (never trust the client). */
export async function uploadHeroGalleryImageAction(
  _prevState: UploadHeroGalleryImageState,
  formData: FormData,
): Promise<UploadHeroGalleryImageState> {
  if (!(await isAdminAuthenticated())) {
    return { status: "error", message: "יש להתחבר כאדמין כדי להעלות תמונות." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "יש לבחור קובץ תמונה." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { status: "error", message: "פורמט לא נתמך — יש להעלות תמונת JPG, PNG או WebP בלבד." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", message: "הקובץ גדול מדי — גודל מקסימלי הוא 5MB." };
  }

  const altText = String(formData.get("alt") ?? "").trim();
  const result = await uploadHeroGalleryImage(file, altText);
  if (!result.success) {
    return { status: "error", message: "ההעלאה נכשלה. נסו שוב בעוד כמה רגעים." };
  }

  revalidatePath("/");
  return { status: "success" };
}

export async function removeHeroGalleryImageAction(imageId: string): Promise<{ success: boolean }> {
  if (!(await isAdminAuthenticated())) return { success: false };
  const success = await removeHeroGalleryImage(imageId);
  if (success) revalidatePath("/");
  return { success };
}

/** Used by the editor panel to load the current gallery on mount — the data itself is public (same list every visitor's homepage render sees), so this isn't admin-gated; only the write actions above are. */
export async function getHeroGalleryImagesAction(): Promise<HeroGalleryImage[]> {
  return listHeroGalleryImages();
}
