import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistrationById } from "@/lib/admin/business-registrations";
import { getNotificationForEntity } from "@/lib/admin/notifications";
import { getCategoryLabel } from "@/data/business-categories";
import { formatNotificationDateTime } from "@/utils/admin-notification-format";
import { getAdminSubscriptionSummary, SUBSCRIPTION_STATUS_LABEL } from "@/lib/admin/subscription-summary";
import { Button } from "@/components/ui/Button";
import { ApproveRejectPanel } from "./ApproveRejectPanel";
import { retryNotificationEmailAction } from "./actions";
import styles from "./detail.module.css";

const PLAN_TIER_LABEL: Record<string, string> = { free: "חינמי", plus: "Plus", premium: "Premium" };
const TRIAL_STATUS_LABEL: Record<string, string> = { "not-started": "טרם הופעל", active: "פעיל", ended: "הסתיים" };

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
  const subscriptionSummary = registration.status === "approved" ? await getAdminSubscriptionSummary(registration, new Date()) : null;

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

      <section className={styles.section} aria-labelledby="plan-heading">
        <h2 id="plan-heading" className={styles.sectionTitle}>
          חבילה נבחרת
        </h2>
        <dl className={styles.detailsGrid}>
          <div>
            <dt>חבילה</dt>
            <dd>{PLAN_TIER_LABEL[registration.plan_tier] ?? registration.plan_tier}</dd>
          </div>
          {registration.plan_tier !== "free" && (
            <>
              <div>
                <dt>סטטוס חודש ניסיון</dt>
                <dd>{TRIAL_STATUS_LABEL[registration.trial_status] ?? registration.trial_status}</dd>
              </div>
              <div>
                <dt>תמונות</dt>
                <dd>{(registration.cover_image ? 1 : 0) + (registration.gallery?.length ?? 0)}</dd>
              </div>
              <div>
                <dt>שירותים</dt>
                <dd>{registration.services?.length ?? 0}</dd>
              </div>
              {registration.promotion && (
                <div>
                  <dt>מבצע</dt>
                  <dd>{registration.promotion.title}</dd>
                </div>
              )}
              {registration.plan_tier === "premium" && (
                <div>
                  <dt>הסכמה לגישה לאזור אישי</dt>
                  <dd>{registration.dashboard_access_consent ? "אושרה" : "לא אושרה"}</dd>
                </div>
              )}
            </>
          )}
        </dl>
      </section>

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

      {subscriptionSummary && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>מצב הופעה באתר ומנוי</h2>
          <dl className={styles.detailsGrid}>
            <div>
              <dt>סוג כרטיס</dt>
              <dd>
                {subscriptionSummary.access.tier === "premium"
                  ? "עמוד מלא (Premium)"
                  : subscriptionSummary.access.tier === "plus"
                    ? "עמוד מלא (Plus)"
                    : "רישום בסיסי"}
              </dd>
            </div>
            <div>
              <dt>סטטוס מנוי</dt>
              <dd>
                {subscriptionSummary.subscription
                  ? (SUBSCRIPTION_STATUS_LABEL[subscriptionSummary.subscription.status] ?? subscriptionSummary.subscription.status)
                  : "לא הופעל ניסיון עדיין"}
              </dd>
            </div>
            {subscriptionSummary.subscription && (
              <>
                <div>
                  <dt>תחילת תקופת ניסיון</dt>
                  <dd>{formatNotificationDateTime(subscriptionSummary.subscription.trialStartedAt)}</dd>
                </div>
                <div>
                  <dt>סיום תקופת ניסיון</dt>
                  <dd>{formatNotificationDateTime(subscriptionSummary.subscription.trialEndsAt)}</dd>
                </div>
                {subscriptionSummary.daysRemaining !== null && (
                  <div>
                    <dt>ימים שנותרו לניסיון</dt>
                    <dd>{subscriptionSummary.daysRemaining}</dd>
                  </div>
                )}
                <div>
                  <dt>ניסיון נוצל</dt>
                  <dd>כן — לא ניתן להפעיל ניסיון נוסף להרשמה זו</dd>
                </div>
              </>
            )}
            <div>
              <dt>עמוד ציבורי</dt>
              <dd>{subscriptionSummary.access.canOpenProfile ? "פעיל" : "לא פעיל — מוצג בארכיון ככרטיס בסיסי בלבד"}</dd>
            </div>
            <div>
              <dt>תגית &quot;עסק מאומת&quot;</dt>
              <dd>{subscriptionSummary.access.canShowVerifiedBadge ? "מוצגת" : "אינה מוצגת"}</dd>
            </div>
          </dl>
          {subscriptionSummary.access.canOpenProfile ? (
            <Link href={`/businesses/${registration.slug}`} target="_blank" rel="noreferrer" className={styles.previewLink}>
              פתיחת עמוד העסק באתר ↗
            </Link>
          ) : (
            <p className={styles.meta}>
              אין עדיין עמוד עסק ציבורי — יופעל אוטומטית כאשר בעל/ת העסק יפעילו ניסיון או מנוי פעיל להרשמה זו.
            </p>
          )}
        </section>
      )}

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
