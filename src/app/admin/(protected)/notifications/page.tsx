import type { Metadata } from "next";
import Link from "next/link";
import { getAdminId } from "@/lib/admin-session";
import { listNotifications, type NotificationFilters } from "@/lib/admin/notifications";
import { NotificationListItem } from "./NotificationListItem";
import type { AdminNotificationType } from "@/types/admin-notification";
import styles from "./notifications.module.css";

export const metadata: Metadata = { title: "מרכז התראות | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: NonNullable<NotificationFilters["status"]>; label: string }[] = [
  { value: "all", label: "הכול" },
  { value: "open", label: "פתוחות" },
  { value: "resolved", label: "טופלו" },
  { value: "unread", label: "לא נקראו" },
];

const TYPE_FILTERS: { value: "all" | AdminNotificationType[]; key: string; label: string }[] = [
  { value: "all", key: "all", label: "הכול" },
  { value: ["business-registration", "business-profile-updated"], key: "businesses", label: "עסקים" },
  { value: ["subscription-expiring"], key: "subscriptions", label: "מנויים" },
  { value: ["payment-failed"], key: "payments", label: "תשלומים" },
  { value: ["contact-message"], key: "contact", label: "פניות" },
];

const SORT_OPTIONS: { value: NonNullable<NotificationFilters["sort"]>; label: string }[] = [
  { value: "newest", label: "החדשות ביותר" },
  { value: "oldest", label: "הישנות ביותר" },
  { value: "priority", label: "עדיפות גבוהה" },
];

type NotificationsPageProps = {
  searchParams: Promise<{ status?: string; type?: string; sort?: string }>;
};

export default async function AdminNotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const adminId = getAdminId();

  const activeStatus = STATUS_FILTERS.some((f) => f.value === params.status) ? (params.status as NotificationFilters["status"]) : "all";
  const activeTypeKey = TYPE_FILTERS.some((f) => f.key === params.type) ? params.type! : "all";
  const activeSort = SORT_OPTIONS.some((s) => s.value === params.sort) ? (params.sort as NotificationFilters["sort"]) : "newest";
  const activeTypeFilter = TYPE_FILTERS.find((f) => f.key === activeTypeKey)!;

  const allNotifications = await listNotifications(adminId, { status: activeStatus, sort: activeSort });
  const notifications =
    activeTypeFilter.value === "all" ? allNotifications : allNotifications.filter((n) => (activeTypeFilter.value as AdminNotificationType[]).includes(n.type));

  function buildHref(overrides: { status?: string; type?: string; sort?: string }): string {
    const next = new URLSearchParams();
    const status = overrides.status ?? activeStatus;
    const type = overrides.type ?? activeTypeKey;
    const sort = overrides.sort ?? activeSort;
    if (status && status !== "all") next.set("status", status);
    if (type && type !== "all") next.set("type", type);
    if (sort && sort !== "newest") next.set("sort", sort);
    const qs = next.toString();
    return qs ? `/admin/notifications?${qs}` : "/admin/notifications";
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>מרכז התראות</h1>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>סטטוס:</span>
          {STATUS_FILTERS.map((f) => (
            <Link key={f.value} href={buildHref({ status: f.value })} className={`${styles.chip} ${activeStatus === f.value ? styles.chipActive : ""}`}>
              {f.label}
            </Link>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>סוג:</span>
          {TYPE_FILTERS.map((f) => (
            <Link key={f.key} href={buildHref({ type: f.key })} className={`${styles.chip} ${activeTypeKey === f.key ? styles.chipActive : ""}`}>
              {f.label}
            </Link>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>מיון:</span>
          {SORT_OPTIONS.map((s) => (
            <Link key={s.value} href={buildHref({ sort: s.value })} className={`${styles.chip} ${activeSort === s.value ? styles.chipActive : ""}`}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className={styles.empty}>אין כרגע התראות חדשות</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((notification) => (
            <NotificationListItem key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </div>
  );
}
