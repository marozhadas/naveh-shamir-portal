import { formatAgorotAsIls, type RevenueBucket } from "@/lib/admin/revenue-metrics";
import styles from "./revenue.module.css";

/**
 * A dependency-free bar chart of COLLECTED revenue (only PayMe-confirmed successful charges), one bar per bucket.
 * Each bar carries its exact value in a tooltip + accessible label, and the whole series is also available as a
 * table for screen readers.
 */
export function RevenueChart({ series }: { series: RevenueBucket[] }) {
  const max = Math.max(1, ...series.map((bucket) => bucket.amountAgorot));
  const labelEvery = Math.max(1, Math.ceil(series.length / 12));
  return (
    <figure className={styles.chart}>
      <div className={styles.bars} role="img" aria-label={`גרף הכנסות בפועל, ${series.length} נקודות`}>
        {series.map((bucket, index) => (
          <div key={bucket.key} className={styles.barCol} title={`${bucket.label}: ${formatAgorotAsIls(bucket.amountAgorot)}`}>
            <div className={styles.bar} style={{ height: `${Math.max(bucket.amountAgorot > 0 ? 3 : 0, (bucket.amountAgorot / max) * 100)}%` }} />
            <span className={styles.barLabel}>{index % labelEvery === 0 ? bucket.label : ""}</span>
          </div>
        ))}
      </div>
      <table className={styles.srOnly}>
        <caption>הכנסות בפועל לפי תקופה</caption>
        <thead>
          <tr>
            <th>תקופה</th>
            <th>סכום</th>
          </tr>
        </thead>
        <tbody>
          {series.map((bucket) => (
            <tr key={bucket.key}>
              <td>{bucket.label}</td>
              <td>{formatAgorotAsIls(bucket.amountAgorot)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
