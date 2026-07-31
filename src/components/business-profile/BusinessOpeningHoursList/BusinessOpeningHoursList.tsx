import type { BusinessOpeningHours } from "@/types/business";
import { getIsraelWeekday, WEEKDAY_LABEL } from "@/utils/get-business-open-status";
import styles from "./BusinessOpeningHoursList.module.css";

type BusinessOpeningHoursListProps = {
  openingHours: BusinessOpeningHours[];
};

function formatIntervals(entry: BusinessOpeningHours): string {
  if (entry.closed || entry.intervals.length === 0) return "סגור";
  return entry.intervals.map((interval) => `${interval.opensAt}–${interval.closesAt}`).join(", ");
}

export function BusinessOpeningHoursList({ openingHours }: BusinessOpeningHoursListProps) {
  if (!openingHours || openingHours.length === 0) return null;

  const today = getIsraelWeekday(new Date());
  const orderedByDay = [...openingHours].sort(
    (a, b) => Object.keys(WEEKDAY_LABEL).indexOf(a.day) - Object.keys(WEEKDAY_LABEL).indexOf(b.day),
  );

  return (
    <section className={styles.section} aria-labelledby="hours-heading">
      <h2 id="hours-heading" className={styles.heading}>
        שעות פעילות
      </h2>
      <ul className={styles.list}>
        {orderedByDay.map((entry) => {
          const isToday = entry.day === today;
          return (
            <li key={entry.day} className={`${styles.row} ${isToday ? styles.today : ""}`}>
              <span className={styles.dayLabel}>
                {WEEKDAY_LABEL[entry.day]}
                {isToday && <span className={styles.todayBadge}>היום</span>}
              </span>
              <span className={entry.closed ? styles.closedValue : styles.hoursValue}>{formatIntervals(entry)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
