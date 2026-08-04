import styles from "./MarketplaceGridSkeleton.module.css";

export function MarketplaceGridSkeleton() {
  return (
    <div className={styles.grid} role="status" aria-label="טוען מודעות">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.image} />
          <div className={styles.line} />
          <div className={styles.lineShort} />
        </div>
      ))}
    </div>
  );
}
