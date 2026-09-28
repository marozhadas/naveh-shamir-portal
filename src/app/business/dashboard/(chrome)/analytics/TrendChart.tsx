import styles from "./analytics.module.css";

type TrendChartProps = {
  trend: { label: string; count: number }[];
};

/** A plain, dependency-free CSS bar chart — this project has no charting library, and a handful of bars doesn't warrant adding one. */
export function TrendChart({ trend }: TrendChartProps) {
  const max = Math.max(1, ...trend.map((point) => point.count));

  return (
    <div className={styles.trendChart} role="img" aria-label="מגמת חשיפה ולחיצות לאורך זמן">
      {trend.map((point, index) => (
        <div key={index} className={styles.trendBar}>
          <div className={styles.trendBarTrack}>
            <div className={styles.trendBarFill} style={{ height: `${Math.round((point.count / max) * 100)}%` }} title={`${point.label}: ${point.count}`} />
          </div>
          <span className={styles.trendBarLabel}>{point.label}</span>
        </div>
      ))}
    </div>
  );
}
