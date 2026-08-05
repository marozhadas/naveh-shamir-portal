import styles from "./EssentialNumbersGridSkeleton.module.css";

export function EssentialNumbersGridSkeleton() {
  return (
    <div className={styles.grid} role="status" aria-label="טוען מספרים חיוניים">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.line} />
          <div className={styles.lineShort} />
          <div className={styles.line} />
        </div>
      ))}
    </div>
  );
}
