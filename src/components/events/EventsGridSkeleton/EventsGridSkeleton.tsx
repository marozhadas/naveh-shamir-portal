import styles from "./EventsGridSkeleton.module.css";

export function EventsGridSkeleton() {
  return (
    <div className={styles.grid} role="status" aria-label="טוען אירועים">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.image} />
          <div className={styles.line} />
          <div className={styles.lineShort} />
        </div>
      ))}
    </div>
  );
}
