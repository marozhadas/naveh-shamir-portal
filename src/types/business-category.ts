/**
 * The business-archive category taxonomy — deliberately separate from the homepage's
 * `BusinessCategory` union (src/types/business.ts), which is a different, smaller set used by
 * the editor-curated homepage cards. `id` is the stable key stored in `Business.categoryIds`
 * and used in the URL (`?category=...`); `slug` mirrors `id` today but is kept distinct in case
 * the two ever need to diverge (e.g. a relabel that shouldn't break saved links).
 */
export type BusinessCategoryDefinition = {
  id: string;
  slug: string;
  label: string;
  iconName?: string;
  visible: boolean;
  order: number;
};
