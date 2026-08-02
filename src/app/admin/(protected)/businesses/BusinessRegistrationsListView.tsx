import { Button } from "@/components/ui/Button";
import { getCategoryLabel } from "@/data/business-categories";
import { formatNotificationDateTime } from "@/utils/admin-notification-format";
import { getBusinessListingAccess } from "@/domain/get-business-listing-access";
import { mapRegistrationToBusiness } from "@/utils/map-registration-to-business";
import type { BusinessRegistrationRow, BusinessRegistrationStatus } from "@/types/business-registration";
import styles from "./businesses-list.module.css";

const STATUS_LABEL: Record<BusinessRegistrationStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר — מוצג באתר",
  rejected: "נדחה",
};

/**
 * The public registration flow has no subscription/trial mechanism wired to it at all yet (only
 * the separate mock owner-dashboard demo does) — so every approved registration always computes
 * to "basic" here. Still computed via the real access function (not hardcoded) so this stays
 * correct automatically if that ever changes.
 */
function getTierLabel(registration: BusinessRegistrationRow): string {
  if (registration.status !== "approved") return "—";
  const business = mapRegistrationToBusiness(registration);
  const access = getBusinessListingAccess(business, null, new Date());
  return access.canOpenProfile ? "עמוד מלא" : "בסיסי";
}

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
          {registration.status === "approved" && <span className={styles.tierBadge}>סוג כרטיס: {getTierLabel(registration)}</span>}
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
