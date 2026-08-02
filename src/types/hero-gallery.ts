/** Mirrors the public.hero_gallery_images table (see create_hero_gallery_images_and_storage_bucket migration). */
export type HeroGalleryImageRow = {
  id: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  display_order: number;
  created_at: string;
};

/** App-facing shape — what HeroSection actually renders. */
export type HeroGalleryImage = {
  id: string;
  url: string;
  alt: string;
  order: number;
};
