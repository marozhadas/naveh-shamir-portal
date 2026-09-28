"use client";

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;
/** Below this, an already-small/optimized file is left alone — no point re-encoding it. */
const SKIP_COMPRESSION_UNDER_BYTES = 1_200_000;
const RECOGNIZED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Recompresses a photo client-side before it's ever sent to the server. Two real problems this
 * fixes at once for phone-camera photos (mainly Android): (1) a modern phone camera JPEG is
 * routinely 3-10MB, well past Next.js's default 1MB Server Action body limit — the upload would
 * fail before the app's own 5MB check (see uploadMarketplaceMedia) ever runs; (2) some Android
 * camera/file-provider combinations hand the browser a File with an empty or generic `type`
 * (not "image/jpeg"), which fails the server's MIME allow-list even though the bytes are a real
 * JPEG. Re-encoding through canvas always produces a definite "image/jpeg" Blob, sidestepping
 * that regardless of what the original file claimed to be.
 *
 * Never throws — any failure (unsupported/corrupt file, canvas unavailable) falls back to
 * returning the original file untouched, so the caller's own validation/error path still runs
 * normally instead of this silently blocking the upload.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  const alreadyFine = RECOGNIZED_TYPES.has(file.type) && file.size <= SKIP_COMPRESSION_UNDER_BYTES;
  if (alreadyFine) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return file;
    // Never make things worse — keep the original if re-encoding didn't actually shrink it.
    if (blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^./\\]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.error("[compressImageForUpload] falling back to the original file:", error);
    return file;
  }
}
