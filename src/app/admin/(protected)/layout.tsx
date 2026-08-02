import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import { countOpenNotifications, listRecentNotifications } from "@/lib/admin/notifications";
import { countPendingRegistrations } from "@/lib/admin/business-registrations";
import { getAdminNotificationPreferences } from "@/lib/admin/preferences";
import { AdminShell } from "@/components/admin/AdminShell/AdminShell";
import styles from "./protected-layout.module.css";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  if (!isSupabaseAdminConfigured()) {
    return (
      <div className={styles.notConfigured}>
        <p className={styles.notConfiguredTitle}>Supabase עדיין לא מוגדר במלואו</p>
        <p>יש להוסיף את SUPABASE_SERVICE_ROLE_KEY בקובץ .env.local כדי לצפות בנתוני הניהול.</p>
      </div>
    );
  }

  const adminId = getAdminId();
  const [openNotificationsCount, pendingBusinessesCount, recentNotifications, preferences] = await Promise.all([
    countOpenNotifications(),
    countPendingRegistrations(),
    listRecentNotifications(adminId, 5),
    getAdminNotificationPreferences(adminId),
  ]);

  return (
    <AdminShell
      initialSnapshot={{ openNotificationsCount, pendingBusinessesCount, recentNotifications }}
      soundEnabled={preferences.soundEnabled}
    >
      {children}
    </AdminShell>
  );
}
