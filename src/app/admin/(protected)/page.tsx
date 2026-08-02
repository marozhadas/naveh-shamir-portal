import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Clock, Bell, MessageSquare, CreditCard, Search, Settings } from "lucide-react";
import { getAdminId } from "@/lib/admin-session";
import { countOpenNotifications, listRecentNotifications } from "@/lib/admin/notifications";
import { countApprovedRegistrations, countPendingRegistrations, listPendingRegistrations } from "@/lib/admin/business-registrations";
import { getCategoryLabel } from "@/data/business-categories";
import { NOTIFICATION_TYPE_LABEL } from "@/utils/admin-notification-labels";
import { formatNotificationDateTime, formatRelativeTime } from "@/utils/admin-notification-format";
import { Button } from "@/components/ui/Button";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "ניהול הפורטל | נווה שמיר", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const adminId = getAdminId();
  const [approvedCount, pendingCount, openNotificationsCount, recentNotifications, pendingBusinesses] = await Promise.all([
    countApprovedRegistrations(),
    countPendingRegistrations(),
    countOpenNotifications(),
    listRecentNotifications(adminId, 5),
    listPendingRegistrations(5),
  ]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>לוח בקרה</h1>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <Building2 size={20} aria-hidden="true" className={styles.summaryIcon} />
          <span className={styles.summaryValue}>{approvedCount}</span>
          <span className={styles.summaryLabel}>עסקים פעילים</span>
        </div>
        <div className={`${styles.summaryCard} ${pendingCount > 0 ? styles.summaryCardAttention : ""}`}>
          <Clock size={20} aria-hidden="true" className={styles.summaryIcon} />
          <span className={styles.summaryValue}>{pendingCount}</span>
          <span className={styles.summaryLabel}>עסקים שממתינים לאישור</span>
        </div>
        <div className={`${styles.summaryCard} ${openNotificationsCount > 0 ? styles.summaryCardAttention : ""}`}>
          <Bell size={20} aria-hidden="true" className={styles.summaryIcon} />
          <span className={styles.summaryValue}>{openNotificationsCount}</span>
          <span className={styles.summaryLabel}>התראות פתוחות</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryCardComingSoon}`}>
          <MessageSquare size={20} aria-hidden="true" className={styles.summaryIcon} />
          <span className={styles.comingSoon}>בקרוב</span>
          <span className={styles.summaryLabel}>פניות חדשות</span>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryCardComingSoon}`}>
          <CreditCard size={20} aria-hidden="true" className={styles.summaryIcon} />
          <span className={styles.comingSoon}>בקרוב</span>
          <span className={styles.summaryLabel}>מנויים פעילים</span>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className={styles.sectionTitle}>
          פעולות מהירות
        </h2>
        <div className={styles.quickActions}>
          <Button href="/admin/businesses/pending" variant="accent" icon={<Building2 size={16} aria-hidden="true" />}>
            צפייה בעסקים חדשים
          </Button>
          <Button href="/admin/notifications" variant="secondary" icon={<Bell size={16} aria-hidden="true" />}>
            פתיחת מרכז ההתראות
          </Button>
          <Button href="/admin/businesses" variant="secondary" icon={<Search size={16} aria-hidden="true" />}>
            צפייה בכל העסקים
          </Button>
          <Button href="/admin/settings/notifications" variant="secondary" icon={<Settings size={16} aria-hidden="true" />}>
            הגדרות התראות
          </Button>
        </div>
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.section} aria-labelledby="recent-notifications-heading">
          <h2 id="recent-notifications-heading" className={styles.sectionTitle}>
            התראות אחרונות
          </h2>
          {recentNotifications.length === 0 ? (
            <p className={styles.empty}>אין כרגע התראות חדשות</p>
          ) : (
            <ul className={styles.notificationList}>
              {recentNotifications.map((notification) => (
                <li key={notification.id} className={styles.notificationItem}>
                  <Link href={notification.action_url ?? "/admin/notifications"} className={styles.notificationLink}>
                    <span className={styles.notificationTop}>
                      <span className={styles.notificationType}>{NOTIFICATION_TYPE_LABEL[notification.type]}</span>
                      {!notification.isRead && <span className={styles.unreadDot}>חדש</span>}
                    </span>
                    <span className={styles.notificationTitle}>{notification.title}</span>
                    <span className={styles.notificationTime}>{formatRelativeTime(notification.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-labelledby="pending-businesses-heading">
          <h2 id="pending-businesses-heading" className={styles.sectionTitle}>
            עסקים שממתינים לאישור
          </h2>
          {pendingBusinesses.length === 0 ? (
            <p className={styles.empty}>אין כרגע עסקים שממתינים לאישור</p>
          ) : (
            <ul className={styles.pendingList}>
              {pendingBusinesses.map((business) => (
                <li key={business.id} className={styles.pendingItem}>
                  <div className={styles.pendingInfo}>
                    <span className={styles.pendingName}>{business.business_name}</span>
                    <span className={styles.pendingMeta}>
                      {getCategoryLabel(business.category_id) ?? business.category_id} · {business.contact_name} ·{" "}
                      {formatNotificationDateTime(business.created_at)}
                    </span>
                  </div>
                  <Button href={`/admin/businesses/${business.id}`} variant="secondary" size="compact">
                    לבדיקה
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
