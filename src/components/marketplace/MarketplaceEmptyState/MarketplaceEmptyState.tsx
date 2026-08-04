import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./MarketplaceEmptyState.module.css";

type MarketplaceEmptyStateProps = {
  onClearFilters: () => void;
};

export function MarketplaceEmptyState({ onClearFilters }: MarketplaceEmptyStateProps) {
  return (
    <div className={styles.wrap} role="status">
      <SearchX size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      <h2 className={styles.title}>לא מצאנו כרגע פריטים שמתאימים לסינון שבחרתם</h2>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClearFilters}>
          ניקוי סינון
        </Button>
        <Button href="/marketplace/post" variant="primary">
          פרסום מודעה
        </Button>
      </div>
    </div>
  );
}
