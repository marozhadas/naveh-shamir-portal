import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./BusinessesEmptyState.module.css";

type BusinessesEmptyStateProps = {
  onClearFilters: () => void;
};

export function BusinessesEmptyState({ onClearFilters }: BusinessesEmptyStateProps) {
  return (
    <div className={styles.wrap} role="status">
      <SearchX size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      <h2 className={styles.title}>לא מצאנו עסק שמתאים לחיפוש</h2>
      <p className={styles.description}>נסו לשנות את מילות החיפוש או להסיר חלק מהסינונים.</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClearFilters}>
          ניקוי כל הסינונים
        </Button>
        <Button href="/business/register" variant="primary">
          הוספת עסק לפורטל
        </Button>
      </div>
    </div>
  );
}
