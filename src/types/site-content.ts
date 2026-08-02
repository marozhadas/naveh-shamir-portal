/** Mirrors the public.site_content_pages table (see create_site_content_pages migration). `content` is validated against pageEditorStateSchema on every read — never trusted as-is. */
export type SiteContentPageRow = {
  page_id: string;
  content: unknown;
  updated_at: string;
};
