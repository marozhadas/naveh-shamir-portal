import { CalendarX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./EventsEmptyState.module.css";

type EventsEmptyStateProps = {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function EventsEmptyState({ hasActiveFilters, onClearFilters }: EventsEmptyStateProps) {
  return (
    <div className={styles.wrap} role="status">
      <CalendarX size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      {hasActiveFilters ? (
        <>
          <h2 className={styles.title}>לא נמצאו אירועים שמתאימים לסינון</h2>
          <Button variant="secondary" onClick={onClearFilters}>
            איפוס הסינון
          </Button>
        </>
      ) : (
        <>
          <h2 className={styles.title}>אין כרגע אירועים להצגה</h2>
          <p className={styles.description}>אירועים חדשים יופיעו כאן בקרוב.</p>
        </>
      )}
    </div>
  );
}
