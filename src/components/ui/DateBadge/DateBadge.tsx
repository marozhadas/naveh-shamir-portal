import styles from "./DateBadge.module.css";

type DateBadgeProps = {
  day: string;
  month: string;
};

export function DateBadge({ day, month }: DateBadgeProps) {
  return (
    <div className={styles.badge} aria-hidden="true">
      <div className={styles.month}>{month}</div>
      <div className={styles.day}>{day}</div>
    </div>
  );
}
