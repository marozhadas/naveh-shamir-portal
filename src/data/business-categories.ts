import type { BusinessCategoryDefinition } from "@/types/business-category";

/**
 * The archive's filterable categories. "הכל" (all) is intentionally NOT included here — it's a
 * UI-only convenience row rendered by the filter components (checked whenever no real category
 * is selected), not a real filterable value, so filterBusinesses/getCategoryCounts never need a
 * special case for it.
 */
export const BUSINESS_CATEGORIES: BusinessCategoryDefinition[] = [
  { id: "beauty", slug: "beauty", label: "ביוטי וטיפוח", iconName: "sparkles", visible: true, order: 1 },
  { id: "food", slug: "food", label: "אוכל וקולינריה", iconName: "utensils", visible: true, order: 2 },
  { id: "babysitter", slug: "babysitter", label: "בייביסיטר וילדים", iconName: "baby", visible: true, order: 3 },
  { id: "legal", slug: "legal", label: "משפטי", iconName: "scale", visible: true, order: 4 },
  { id: "medical", slug: "medical", label: "רפואי ובריאות", iconName: "heart-pulse", visible: true, order: 5 },
  { id: "education", slug: "education", label: "חינוך וחוגים", iconName: "graduation-cap", visible: true, order: 6 },
  { id: "home-garden", slug: "home-garden", label: "לבית ולגינה", iconName: "home", visible: true, order: 7 },
  { id: "trades", slug: "trades", label: "בעלי מקצוע", iconName: "wrench", visible: true, order: 8 },
  { id: "finance", slug: "finance", label: "פיננסים וביטוח", iconName: "landmark", visible: true, order: 9 },
  { id: "digital", slug: "digital", label: "דיגיטל וקריאייטיב", iconName: "monitor", visible: true, order: 10 },
  { id: "fitness", slug: "fitness", label: "ספורט וכושר", iconName: "dumbbell", visible: true, order: 11 },
  { id: "events", slug: "events", label: "אירועים", iconName: "party-popper", visible: true, order: 12 },
  { id: "retail", slug: "retail", label: "חנויות ומסחר", iconName: "store", visible: true, order: 13 },
  { id: "other", slug: "other", label: "שונות", iconName: "shapes", visible: true, order: 99 },
];

export function getVisibleBusinessCategories(): BusinessCategoryDefinition[] {
  return BUSINESS_CATEGORIES.filter((category) => category.visible).sort((a, b) => a.order - b.order);
}

export function getCategoryLabel(categoryId: string): string | null {
  return BUSINESS_CATEGORIES.find((category) => category.id === categoryId)?.label ?? null;
}
