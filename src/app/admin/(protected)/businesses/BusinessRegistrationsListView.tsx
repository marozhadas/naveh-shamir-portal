import Image from "next/image";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCategoryLabel } from "@/data/business-categories";
import { formatNotificationDateTime } from "@/utils/admin-notification-format";
import { SUBSCRIPTION_STATUS_LABEL } from "@/lib/admin/subscription-summary";
import { DeleteBusinessButton } from "./[id]/DeleteBusinessButton";
import type { AdminSubscriptionSummary } from "@/lib/admin/subscription-summary";
import type { BusinessRegistrationRow, BusinessRegistrationStatus } from "@/types/business-registration";
import type { BusinessListingTier } from "@/types/business-listing-access";
import styles from "./businesses-list.module.css";

const STATUS_LABEL: Record<BusinessRegistrationStatus, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר — מוצג באתר",
  rejected: "נדחה",
};

const TIER_LABEL: Record<BusinessListingTier, string> = { basic: "בסיסי", plus: "Plus", premium: "פרימיום" };

function getSubscriptionLabel(summary: AdminSubscriptionSummary): string {
  if (!summary.subscription) return "ללא מנוי — לא הופעל ניסיון";
  const base = SUBSCRIPTION_STATUS_LABEL[summary.subscription.status] ?? summary.subscription.status;
  return summary.daysRemaining !== null ? `${base} · ${summary.daysRemaining} ימים נותרו` : base;
}

type BusinessRegistrationsListViewProps = {
  rows: { registration: BusinessRegistrationRow; summary: AdminSubscriptionSummary }[];
  emptyMessage: string;
};

export function BusinessRegistrationsListView({ rows, emptyMessage }: BusinessRegistrationsListViewProps) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.list}>
      {rows.map(({ registration, summary }) => (
        <li key={registration.id} className={`${styles.card} ${styles[registration.status]}`}>
          <div className={styles.cardMain}>
            <div className={styles.thumb}>
              {registration.cover_image?.url ? (
                <Image src={registration.cover_image.url} alt={registration.cover_image.alt || registration.business_name} fill sizes="48px" className={styles.thumbImage} />
              ) : (
                <div className={styles.thumbPlaceholder} aria-hidden="true">
                  <Store size={20} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className={styles.cardInfo}>
              <span className={styles.businessName}>{registration.business_name}</span>
              <span className={styles.meta}>
                {getCategoryLabel(registration.category_id) ?? registration.category_id} · {registration.contact_name} · נשלח{" "}
                {formatNotificationDateTime(registration.created_at)}
              </span>
            </div>
          </div>
          <span className={styles.statusBadge}>{STATUS_LABEL[registration.status]}</span>
          <span className={styles.tierBadge}>חבילה נבחרת: {TIER_LABEL[registration.plan_tier === "free" ? "basic" : registration.plan_tier]}</span>
          {registration.status === "approved" && (
            <span className={styles.tierBadge}>
              חבילה פעילה: {TIER_LABEL[summary.access.tier]} · {getSubscriptionLabel(summary)}
              {registration.plan_tier !== "free" && registration.plan_tier !== summary.access.tier && summary.access.tier === "basic" && " · ממתין להפעלה"}
            </span>
          )}
          <div className={styles.cardActions}>
            <Button href={`/admin/businesses/${registration.id}`} variant="secondary" size="compact">
              {registration.status === "pending" ? "לבדיקה" : "צפייה"}
            </Button>
            <Button href={`/admin/businesses/${registration.id}/edit`} variant="secondary" size="compact">
              עריכה
            </Button>
            <DeleteBusinessButton registrationId={registration.id} businessName={registration.business_name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
