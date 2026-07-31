import styles from "./BusinessCardSkeleton.module.css";

/** Mirrors BusinessCard's proportions (image + tag + title + two text lines + actions row). */
export function BusinessCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.image} />
      <div className={styles.body}>
        <div className={styles.tag} />
        <div className={styles.title} />
        <div className={styles.line} />
        <div className={styles.lineShort} />
        <div className={styles.actions}>
          <div className={styles.button} />
          <div className={styles.button} />
        </div>
      </div>
    </div>
  );
}
