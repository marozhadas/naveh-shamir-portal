export type MarketplaceCategoryDefinition = {
  id: string;
  label: string;
  visible: boolean;
  order: number;
};

/** Editable in one place — add/remove/reorder categories here without touching any UI code (spec: "לבנות את הקטגוריות בצורה דינמית"). */
export const MARKETPLACE_CATEGORIES: MarketplaceCategoryDefinition[] = [
  { id: "furniture", label: "ריהוט", visible: true, order: 1 },
  { id: "appliances", label: "מוצרי חשמל", visible: true, order: 2 },
  { id: "kids-baby", label: "ילדים ותינוקות", visible: true, order: 3 },
  { id: "toys-games", label: "צעצועים ומשחקים", visible: true, order: 4 },
  { id: "clothing", label: "ביגוד והנעלה", visible: true, order: 5 },
  { id: "books", label: "ספרים", visible: true, order: 6 },
  { id: "housewares", label: "כלי בית", visible: true, order: 7 },
  { id: "sports-leisure", label: "ספורט ופנאי", visible: true, order: 8 },
  { id: "computers-electronics", label: "מחשבים ואלקטרוניקה", visible: true, order: 9 },
  { id: "office", label: "ציוד משרדי", visible: true, order: 10 },
  { id: "other", label: "אחר", visible: true, order: 99 },
];

export function getVisibleMarketplaceCategories(): MarketplaceCategoryDefinition[] {
  return MARKETPLACE_CATEGORIES.filter((category) => category.visible).sort((a, b) => a.order - b.order);
}

export function getMarketplaceCategoryLabel(categoryId: string): string | null {
  return MARKETPLACE_CATEGORIES.find((category) => category.id === categoryId)?.label ?? null;
}
