import styles from "./ResultsCount.module.css";

type ResultsCountProps = {
  count: number;
};

function countLabel(count: number): string {
  if (count === 0) return "לא נמצאו עסקים";
  if (count === 1) return "נמצא עסק אחד";
  return `נמצאו ${count} עסקים`;
}

/** aria-live is on the wrapper, not re-announced on every keystroke — the parent only updates `count` after the search debounce settles. */
export function ResultsCount({ count }: ResultsCountProps) {
  return (
    <p className={styles.count} aria-live="polite">
      {countLabel(count)}
    </p>
  );
}
