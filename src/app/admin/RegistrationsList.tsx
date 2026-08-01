import { Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCategoryLabel } from "@/data/business-categories";
import { approveRegistrationAction, rejectRegistrationAction, resetToPendingAction } from "./actions";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import styles from "./admin.module.css";

const STATUS_LABEL: Record<BusinessRegistrationRow["status"], string> = {
  pending: "ממתין לאישור",
  approved: "מאושר — מוצג באתר",
  rejected: "נדחה",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type RegistrationsListProps = {
  registrations: BusinessRegistrationRow[];
};

export function RegistrationsList({ registrations }: RegistrationsListProps) {
  if (registrations.length === 0) {
    return <p className={styles.empty}>עדיין לא נשלחו הרשמות דרך טופס ההרשמה.</p>;
  }

  return (
    <ul className={styles.list}>
      {registrations.map((row) => (
        <li key={row.id} className={`${styles.card} ${styles[row.status]}`}>
          <div className={styles.cardHead}>
            <div>
              <p className={styles.businessName}>{row.business_name}</p>
              <p className={styles.meta}>
                {getCategoryLabel(row.category_id) ?? row.category_id} · נשלח {formatDate(row.created_at)}
              </p>
            </div>
            <span className={styles.statusBadge}>{STATUS_LABEL[row.status]}</span>
          </div>

          <p className={styles.description}>{row.description}</p>

          <dl className={styles.detailsGrid}>
            <div>
              <dt>איש/אשת קשר</dt>
              <dd>{row.contact_name}</dd>
            </div>
            {row.phone && (
              <div>
                <dt>טלפון</dt>
                <dd dir="ltr">{row.phone}</dd>
              </div>
            )}
            {row.whatsapp_phone && (
              <div>
                <dt>וואטסאפ</dt>
                <dd dir="ltr">{row.whatsapp_phone}</dd>
              </div>
            )}
            {row.email && (
              <div>
                <dt>אימייל</dt>
                <dd dir="ltr">{row.email}</dd>
              </div>
            )}
            {row.website_url && (
              <div>
                <dt>אתר</dt>
                <dd dir="ltr">{row.website_url}</dd>
              </div>
            )}
            {row.address && (
              <div>
                <dt>כתובת</dt>
                <dd>{row.address}</dd>
              </div>
            )}
            {row.service_area && (
              <div>
                <dt>אזור שירות</dt>
                <dd>{row.service_area}</dd>
              </div>
            )}
          </dl>

          <div className={styles.cardActions}>
            {row.status !== "approved" && (
              <form action={approveRegistrationAction.bind(null, row.id)}>
                <Button type="submit" variant="accent" size="compact" icon={<Check size={15} aria-hidden="true" />}>
                  אישור
                </Button>
              </form>
            )}
            {row.status !== "rejected" && (
              <form action={rejectRegistrationAction.bind(null, row.id)}>
                <Button type="submit" variant="secondary" size="compact" icon={<X size={15} aria-hidden="true" />}>
                  דחייה
                </Button>
              </form>
            )}
            {row.status !== "pending" && (
              <form action={resetToPendingAction.bind(null, row.id)}>
                <Button type="submit" variant="secondary" size="compact" icon={<RotateCcw size={15} aria-hidden="true" />}>
                  החזרה להמתנה
                </Button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
