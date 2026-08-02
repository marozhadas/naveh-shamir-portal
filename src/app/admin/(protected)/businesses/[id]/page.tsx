import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrationById } from "@/lib/admin/business-registrations";
import { getNotificationForEntity } from "@/lib/admin/notifications";
import { getCategoryLabel } from "@/data/business-categories";
import { formatNotificationDateTime } from "@/utils/admin-notification-format";
import { mapRegistrationToBusiness } from "@/utils/map-registration-to-business";
import { getBusinessListingAccess } from "@/domain/get-business-listing-access";
import { Button } from "@/components/ui/Button";
import { ApproveRejectPanel } from "./ApproveRejectPanel";
import { retryNotificationEmailAction } from "./actions";
import styles from "./detail.module.css";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין לאישור",
  approved: "מאושר — מוצג באתר",
  rejected: "נדחה",
};

const EMAIL_STATUS_LABEL: Record<string, string> = {
  pending: "ממתין לשליחה",
  sent: "נשלח",
  failed: "שליחה נכשלה",
  skipped: "לא נשלח (מצב הדגמה / כבוי בהגדרות)",
};

type BusinessDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: BusinessDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const registration = await getRegistrationById(id);
  return { title: registration ? `${registration.business_name} | ניהול הפורטל` : "עסק | ניהול הפורטל", robots: { index: false, follow: false } };
}

export default async function AdminBusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { id } = await params;
  const registration = await getRegistrationById(id);
  if (!registration) notFound();

  const notification = await getNotificationForEntity("business-registration", id);

  return (
    <div className={styles.page}>
      <Link href="/admin/businesses" className={styles.back}>
        ← חזרה לרשימת העסקים
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{registration.business_name}</h1>
          <p className={styles.meta}>
            {getCategoryLabel(registration.category_id) ?? registration.category_id} · נשלח {formatNotificationDateTime(registration.created_at)}
          </p>
        </div>
        <span className={styles.statusBadge}>{STATUS_LABEL[registration.status]}</span>
      </div>

      {registration.status === "rejected" && registration.rejection_reason && (
        <p className={styles.rejectionNotice}>סיבת הדחייה: {registration.rejection_reason}</p>
      )}

      <section className={styles.section} aria-labelledby="description-heading">
        <h2 id="description-heading" className={styles.sectionTitle}>
          תיאור
        </h2>
        <p className={styles.description}>{registration.description}</p>
        {registration.short_description && <p className={styles.description}>{registration.short_description}</p>}
      </section>

      <section className={styles.section} aria-labelledby="details-heading">
        <h2 id="details-heading" className={styles.sectionTitle}>
          פרטי קשר
        </h2>
        <dl className={styles.detailsGrid}>
          <div>
            <dt>איש/אשת קשר</dt>
            <dd>{registration.contact_name}</dd>
          </div>
          {registration.phone && (
            <div>
              <dt>טלפון</dt>
              <dd dir="ltr">{registration.phone}</dd>
            </div>
          )}
          {registration.whatsapp_phone && (
            <div>
              <dt>וואטסאפ</dt>
              <dd dir="ltr">{registration.whatsapp_phone}</dd>
            </div>
          )}
          {registration.email && (
            <div>
              <dt>אימייל</dt>
              <dd dir="ltr">{registration.email}</dd>
            </div>
          )}
          {registration.website_url && (
            <div>
              <dt>אתר</dt>
              <dd dir="ltr">{registration.website_url}</dd>
            </div>
          )}
          {registration.address && (
            <div>
              <dt>כתובת</dt>
              <dd>{registration.address}</dd>
            </div>
          )}
          {registration.service_area && (
            <div>
              <dt>אזור שירות</dt>
              <dd>{registration.service_area}</dd>
            </div>
          )}
        </dl>
      </section>

      {registration.status === "approved" &&
        (() => {
          const access = getBusinessListingAccess(mapRegistrationToBusiness(registration), null, new Date());
          return (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>מצב הופעה באתר</h2>
              <dl className={styles.detailsGrid}>
                <div>
                  <dt>סוג כרטיס</dt>
                  <dd>{access.canOpenProfile ? "עמוד מלא (Premium)" : "רישום בסיסי"}</dd>
                </div>
                <div>
                  <dt>מנוי</dt>
                  <dd>אין מנוי מחובר להרשמה זו</dd>
                </div>
                <div>
                  <dt>עמוד ציבורי</dt>
                  <dd>{access.canOpenProfile ? "פעיל" : "לא פעיל — מוצג בארכיון ככרטיס בסיסי בלבד"}</dd>
                </div>
                <div>
                  <dt>תגית &quot;עסק מאומת&quot;</dt>
                  <dd>{access.canShowVerifiedBadge ? "מוצגת" : "אינה מוצגת"}</dd>
                </div>
              </dl>
              {access.canOpenProfile ? (
                <Link href={`/businesses/${registration.slug}`} target="_blank" rel="noreferrer" className={styles.previewLink}>
                  פתיחת עמוד העסק באתר ↗
                </Link>
              ) : (
                <p className={styles.meta}>
                  אין עדיין עמוד עסק ציבורי — יופעל אוטומטית כאשר יחובר מנוי פעיל או תקופת ניסיון להרשמה זו.
                </p>
              )}
            </section>
          );
        })()}

      {notification && (
        <section className={styles.section} aria-labelledby="email-heading">
          <h2 id="email-heading" className={styles.sectionTitle}>
            מייל התראה לאדמין
          </h2>
          <div className={styles.emailStatusRow}>
            <span className={styles.emailStatusBadge}>{EMAIL_STATUS_LABEL[notification.email_status]}</span>
            <span className={styles.meta}>נסיונות: {notification.email_attempts}/3</span>
          </div>
          {notification.email_error && <p className={styles.emailError}>{notification.email_error}</p>}
          {notification.email_status === "failed" && notification.email_attempts < 3 && (
            <form action={retryNotificationEmailAction.bind(null, notification.id)}>
              <Button type="submit" variant="secondary" size="compact">
                ניסיון שליחה חוזר
              </Button>
            </form>
          )}
        </section>
      )}

      {registration.status === "pending" && <ApproveRejectPanel registrationId={registration.id} businessName={registration.business_name} />}
    </div>
  );
}
