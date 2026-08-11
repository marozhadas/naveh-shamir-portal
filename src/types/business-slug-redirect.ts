/** Mirrors the public.business_slug_redirects table (see the create_business_slug_redirects migration). */
export type BusinessSlugRedirectRow = {
  id: string;
  business_id: string;
  old_slug: string;
  new_slug: string;
  created_at: string;
};
