import { Button } from "@/components/ui/Button";
import { getCategoryLabel } from "@/data/business-categories";
import { formatNotificationDateTime } from "@/utils/admin-notification-format";
import type { BusinessRegistrationRow, BusinessRegistrationStatus } from "@/types/business-registration";
import styles from "./businesses-list.module.css";

const STATUS_LABEL: Record<BusinessRegistrationStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר — מוצג באתר",
  rejected: "נדחה",
};

type BusinessRegistrationsListViewProps = {
  registrations: BusinessRegistrationRow[];
  emptyMessage: string;
};

export function BusinessRegistrationsListView({ registrations, emptyMessage }: BusinessRegistrationsListViewProps) {
  if (registrations.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.list}>
      {registrations.map((registration) => (
        <li key={registration.id} className={`${styles.card} ${styles[registration.status]}`}>
          <div className={styles.cardInfo}>
            <span className={styles.businessName}>{registration.business_name}</span>
            <span className={styles.meta}>
              {getCategoryLabel(registration.category_id) ?? registration.category_id} · {registration.contact_name} · נשלח{" "}
              {formatNotificationDateTime(registration.created_at)}
            </span>
          </div>
          <span className={styles.statusBadge}>{STATUS_LABEL[registration.status]}</span>
          <div className={styles.cardActions}>
            <Button href={`/admin/businesses/${registration.id}`} variant="secondary" size="compact">
              {registration.status === "pending" ? "לבדיקה" : "צפייה"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
