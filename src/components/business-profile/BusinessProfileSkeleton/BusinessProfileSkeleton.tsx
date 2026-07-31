import styles from "./BusinessProfileSkeleton.module.css";

export function BusinessProfileSkeleton() {
  return (
    <div className={styles.wrap} role="status" aria-label="טוען את פרטי העסק">
      <div className={styles.hero}>
        <div className={styles.image} />
        <div className={styles.content}>
          <div className={styles.tag} />
          <div className={styles.title} />
          <div className={styles.line} />
          <div className={styles.actions}>
            <div className={styles.button} />
            <div className={styles.button} />
          </div>
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle} />
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.lineShort} />
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle} />
        <div className={styles.cardsRow}>
          <div className={styles.card} />
          <div className={styles.card} />
          <div className={styles.card} />
        </div>
      </div>
    </div>
  );
}
