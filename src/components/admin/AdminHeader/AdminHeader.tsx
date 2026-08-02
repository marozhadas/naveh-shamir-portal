"use client";

import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/admin/NotificationBell/NotificationBell";
import type { AdminNotificationWithReadState } from "@/types/admin-notification";
import styles from "./AdminHeader.module.css";

type AdminHeaderProps = {
  openNotificationsCount: number;
  recentNotifications: AdminNotificationWithReadState[];
  onMarkRead: (notificationId: string) => void;
  onOpenMobileNav: () => void;
  logoutAction: () => Promise<void>;
};

export function AdminHeader({ openNotificationsCount, recentNotifications, onMarkRead, onOpenMobileNav, logoutAction }: AdminHeaderProps) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.mobileMenuButton} onClick={onOpenMobileNav} aria-label="פתיחת תפריט ניווט" aria-controls="admin-mobile-nav">
        <Menu size={20} aria-hidden="true" />
      </button>

      <span className={styles.title}>ניהול הפורטל</span>

      <div className={styles.actions}>
        <NotificationBell openCount={openNotificationsCount} recentNotifications={recentNotifications} onMarkRead={onMarkRead} />
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" size="compact" icon={<LogOut size={15} aria-hidden="true" />}>
            יציאה
          </Button>
        </form>
      </div>
    </header>
  );
}
