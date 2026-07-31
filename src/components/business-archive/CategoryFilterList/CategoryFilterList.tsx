import { Checkbox } from "@/components/ui/Checkbox";
import { getVisibleBusinessCategories } from "@/data/business-categories";
import styles from "./CategoryFilterList.module.css";

type CategoryFilterListProps = {
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  counts: Record<string, number>;
  totalCount: number;
};

/**
 * Shared between the desktop/tablet sidebar and the mobile sheet (spec: don't build the
 * category list twice). "הכל" is a UI-only row — checked whenever nothing else is selected,
 * and choosing it just clears the selection; it's never part of the real category data.
 */
export function CategoryFilterList({ selectedCategoryIds, onChange, counts, totalCount }: CategoryFilterListProps) {
  const categories = getVisibleBusinessCategories();
  const isAllSelected = selectedCategoryIds.length === 0;

  function toggleCategory(categoryId: string, checked: boolean) {
    if (checked) {
      onChange([...selectedCategoryIds, categoryId]);
    } else {
      onChange(selectedCategoryIds.filter((id) => id !== categoryId));
    }
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>סינון לפי קטגוריה</legend>
      <div className={styles.list}>
        <Checkbox label="הכל" checked={isAllSelected} onChange={() => onChange([])} trailing={totalCount} />
        {categories.map((category) => (
          <Checkbox
            key={category.id}
            label={category.label}
            checked={selectedCategoryIds.includes(category.id)}
            onChange={(checked) => toggleCategory(category.id, checked)}
            trailing={counts[category.id] ?? 0}
          />
        ))}
      </div>
    </fieldset>
  );
}
