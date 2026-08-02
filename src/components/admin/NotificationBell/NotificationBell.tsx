"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatBadgeCount, formatRelativeTime } from "@/utils/admin-notification-format";
import { NOTIFICATION_TYPE_LABEL } from "@/utils/admin-notification-labels";
import type { AdminNotificationWithReadState } from "@/types/admin-notification";
import styles from "./NotificationBell.module.css";

type NotificationBellProps = {
  openCount: number;
  recentNotifications: AdminNotificationWithReadState[];
  onMarkRead: (notificationId: string) => void;
};

export function NotificationBell({ openCount, recentNotifications, onMarkRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    popoverRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.bellButton}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`התראות${openCount > 0 ? ` (${openCount} פתוחות)` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={19} aria-hidden="true" />
        {openCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {formatBadgeCount(openCount)}
          </span>
        )}
      </button>

      {open && (
        <div id={popoverId} ref={popoverRef} role="dialog" aria-label="התראות אחרונות" className={styles.popover}>
          <div className={styles.popoverHeader}>
            <span>התראות אחרונות</span>
          </div>

          {recentNotifications.length === 0 ? (
            <p className={styles.empty}>אין כרגע התראות חדשות</p>
          ) : (
            <ul className={styles.list}>
              {recentNotifications.map((notification) => (
                <li key={notification.id} className={styles.item}>
                  <Link
                    href={notification.action_url ?? "/admin/notifications"}
                    className={`${styles.itemLink} ${notification.isRead ? "" : styles.unread}`}
                    onClick={() => {
                      onMarkRead(notification.id);
                      setOpen(false);
                    }}
                  >
                    <span className={styles.itemTop}>
                      <span className={styles.typeTag}>{NOTIFICATION_TYPE_LABEL[notification.type]}</span>
                      {!notification.isRead && (
                        <span className={styles.unreadDot} aria-label="לא נקראה">
                          חדש
                        </span>
                      )}
                    </span>
                    <span className={styles.itemTitle}>{notification.title}</span>
                    <span className={styles.itemTime}>{formatRelativeTime(notification.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link href="/admin/notifications" className={styles.viewAll} onClick={() => setOpen(false)}>
            לכל ההתראות
          </Link>
        </div>
      )}
    </div>
  );
}
