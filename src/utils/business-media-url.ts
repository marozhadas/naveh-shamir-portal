/**
 * The business-media bucket layout (see uploadBusinessMedia): every image a business owns lives
 * under `registrations/<registrationId>/...`. Owner-submitted image URLs are only ever accepted
 * when they point into THAT folder of THIS project's bucket — never an arbitrary external URL
 * and never another business's folder.
 */
const BUCKET = "business-media";

export function businessMediaFolderPrefix(supabaseUrl: string, registrationId: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/registrations/${registrationId}/`;
}

export function isOwnedBusinessMediaUrl(url: string, supabaseUrl: string, registrationId: string): boolean {
  if (!supabaseUrl || !registrationId) return false;
  const prefix = businessMediaFolderPrefix(supabaseUrl, registrationId);
  // Reject path tricks like ".." that could escape the folder once the URL is resolved.
  return url.startsWith(prefix) && !url.slice(prefix.length).includes("..");
}

/** Every image URL referenced by an edit payload (cover, gallery, testimonial photos). */
export function collectBusinessImageUrls(values: {
  coverImage: { url: string };
  gallery: { url: string }[];
  testimonials: { imageUrl?: string }[];
}): string[] {
  const urls = [values.coverImage.url, ...values.gallery.map((image) => image.url), ...values.testimonials.map((t) => t.imageUrl ?? "")];
  return urls.filter((url) => url.length > 0);
}
