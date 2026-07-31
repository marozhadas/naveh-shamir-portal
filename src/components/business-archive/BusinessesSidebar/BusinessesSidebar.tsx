import { CategoryFilterList } from "@/components/business-archive/CategoryFilterList/CategoryFilterList";
import styles from "./BusinessesSidebar.module.css";

type BusinessesSidebarProps = {
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  counts: Record<string, number>;
  totalCount: number;
};

/** Desktop/tablet-wide only (hidden below the layout breakpoint — see BusinessesArchive.module.css). */
export function BusinessesSidebar({ selectedCategoryIds, onChange, counts, totalCount }: BusinessesSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="סינון עסקים">
      <CategoryFilterList
        selectedCategoryIds={selectedCategoryIds}
        onChange={onChange}
        counts={counts}
        totalCount={totalCount}
      />
    </aside>
  );
}
