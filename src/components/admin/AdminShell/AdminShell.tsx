"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader/AdminHeader";
import { useAdminNotificationPolling } from "@/hooks/use-admin-notification-polling";
import { useAdminNotificationSound } from "@/hooks/use-admin-notification-sound";
import { getNotificationSnapshotAction, markNotificationReadAction, adminLogoutAction, type NotificationSnapshot } from "@/app/admin/shared-actions";
import styles from "./AdminShell.module.css";

type AdminShellProps = {
  initialSnapshot: NotificationSnapshot;
  soundEnabled: boolean;
  children: ReactNode;
};

const TOAST_DURATION_MS = 5000;

export function AdminShell({ initialSnapshot, soundEnabled, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playNotificationSound = useAdminNotificationSound(soundEnabled);

  const { snapshot, setSnapshot } = useAdminNotificationPolling({
    initialSnapshot,
    fetchSnapshot: getNotificationSnapshotAction,
    onNewNotifications: (newCount) => {
      playNotificationSound();
      setToastMessage(newCount === 1 ? "התקבלה התראה חדשה" : `התקבלו ${newCount} התראות חדשות`);
    },
  });

  useEffect(() => {
    if (!toastMessage) return;
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [toastMessage]);

  const handleMarkRead = useCallback(
    (id: string) => {
      setSnapshot((prev) => ({
        ...prev,
        recentNotifications: prev.recentNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      }));
      void markNotificationReadAction(id);
    },
    [setSnapshot],
  );

  return (
    <div className={styles.shell}>
      <AdminSidebar
        pendingBusinessesCount={snapshot.pendingBusinessesCount}
        openNotificationsCount={snapshot.openNotificationsCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className={styles.main}>
        <AdminHeader
          openNotificationsCount={snapshot.openNotificationsCount}
          recentNotifications={snapshot.recentNotifications}
          onMarkRead={handleMarkRead}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          logoutAction={adminLogoutAction}
        />
        <div className={styles.content}>{children}</div>
      </div>

      {toastMessage && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
