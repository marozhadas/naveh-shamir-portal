import { MessageCircleOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./WhatsAppGroupsEmptyState.module.css";

type WhatsAppGroupsEmptyStateProps = {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function WhatsAppGroupsEmptyState({ hasActiveFilters, onClearFilters }: WhatsAppGroupsEmptyStateProps) {
  return (
    <div className={styles.wrap} role="status">
      <MessageCircleOff size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
      {hasActiveFilters ? (
        <>
          <h3 className={styles.title}>לא נמצאו קבוצות שמתאימות לחיפוש</h3>
          <Button variant="secondary" onClick={onClearFilters}>
            איפוס החיפוש
          </Button>
        </>
      ) : (
        <>
          <h3 className={styles.title}>אין כרגע קבוצות WhatsApp להצגה</h3>
          <p className={styles.description}>קבוצות שכונתיות חדשות יתווספו כאן בקרוב.</p>
        </>
      )}
    </div>
  );
}
