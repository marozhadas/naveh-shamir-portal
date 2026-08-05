import styles from "./WhatsAppGroupsGridSkeleton.module.css";

export function WhatsAppGroupsGridSkeleton() {
  return (
    <div className={styles.grid} role="status" aria-label="טוען קבוצות WhatsApp">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.line} />
          <div className={styles.lineShort} />
          <div className={styles.line} />
        </div>
      ))}
    </div>
  );
}
