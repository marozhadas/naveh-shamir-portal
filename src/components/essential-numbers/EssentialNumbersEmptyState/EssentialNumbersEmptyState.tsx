import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./EssentialNumbersEmptyState.module.css";

type EssentialNumbersEmptyStateProps = {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function EssentialNumbersEmptyState({ hasActiveFilters, onClearFilters }: EssentialNumbersEmptyStateProps) {
  return (
    <div className={styles.wrap} role="status">
      <PhoneOff size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      {hasActiveFilters ? (
        <>
          <h2 className={styles.title}>לא נמצאו מספרים שמתאימים לחיפוש</h2>
          <Button variant="secondary" onClick={onClearFilters}>
            איפוס החיפוש
          </Button>
        </>
      ) : (
        <>
          <h2 className={styles.title}>אין כרגע מספרים להצגה</h2>
          <p className={styles.description}>מספרים חיוניים יתווספו כאן בקרוב.</p>
        </>
      )}
    </div>
  );
}
