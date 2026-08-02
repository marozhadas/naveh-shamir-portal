"use client";

import Link from "next/link";
import { NOTIFICATION_TYPE_ICON, NOTIFICATION_TYPE_LABEL, NOTIFICATION_STATUS_LABEL, NOTIFICATION_PRIORITY_LABEL } from "@/utils/admin-notification-labels";
import { formatNotificationDateTime } from "@/utils/admin-notification-format";
import { markNotificationReadAction } from "@/app/admin/shared-actions";
import type { AdminNotificationWithReadState } from "@/types/admin-notification";
import styles from "./notifications.module.css";

export function NotificationListItem({ notification }: { notification: AdminNotificationWithReadState }) {
  const Icon = NOTIFICATION_TYPE_ICON[notification.type];
  const statusPillClass =
    notification.status === "open" ? styles.pillStatusOpen : notification.status === "resolved" ? styles.pillStatusResolved : styles.pillStatusDismissed;
  const priorityPillClass =
    notification.priority === "urgent" || notification.priority === "high" ? styles.pillPriorityUrgent : "";

  return (
    <li className={`${styles.item} ${notification.isRead ? "" : styles.itemUnread}`}>
      <Icon size={20} aria-hidden="true" />
      <div className={styles.itemBody}>
        <div className={styles.itemTop}>
          <span className={styles.itemTitle}>{notification.title}</span>
          {!notification.isRead && (
            <span className={`${styles.pill} ${styles.pillUnread}`} aria-label="לא נקראה">
              לא נקראה
            </span>
          )}
        </div>
        <p className={styles.itemMessage}>{notification.message}</p>
        <div className={styles.itemMeta}>
          <span>{NOTIFICATION_TYPE_LABEL[notification.type]}</span>
          <span>{formatNotificationDateTime(notification.created_at)}</span>
          <span className={`${styles.pill} ${statusPillClass}`}>{NOTIFICATION_STATUS_LABEL[notification.status]}</span>
          <span className={`${styles.pill} ${priorityPillClass}`}>{NOTIFICATION_PRIORITY_LABEL[notification.priority]}</span>
        </div>
      </div>
      <Link
        href={notification.action_url ?? "#"}
        className={styles.itemAction}
        onClick={() => {
          void markNotificationReadAction(notification.id);
        }}
      >
        מעבר לטיפול
      </Link>
    </li>
  );
}
