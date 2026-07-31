import styles from "./TrialProgressBar.module.css";

type TrialProgressBarProps = {
  daysRemaining: number;
  totalDays?: number;
};

export function TrialProgressBar({ daysRemaining, totalDays = 30 }: TrialProgressBarProps) {
  const daysElapsed = Math.max(0, totalDays - daysRemaining);
  const percent = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const label = daysRemaining === 1 ? "נותר יום אחד בתקופת הניסיון" : `נותרו ${daysRemaining} ימים בתקופת הניסיון`;

  return (
    <div className={styles.wrap}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        <span className={styles.dayCount}>{`יום ${daysElapsed} מתוך ${totalDays}`}</span>
      </div>
      <div className={styles.track} role="progressbar" aria-valuenow={daysElapsed} aria-valuemin={0} aria-valuemax={totalDays} aria-label={label}>
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
