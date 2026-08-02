import type { Metadata } from "next";
import { getAdminId } from "@/lib/admin-session";
import { getAdminNotificationPreferences } from "@/lib/admin/preferences";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";
import styles from "./settings.module.css";

export const metadata: Metadata = { title: "הגדרות התראות | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminNotificationSettingsPage() {
  const adminId = getAdminId();
  const preferences = await getAdminNotificationPreferences(adminId);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>הגדרות התראות</h1>
      <NotificationPreferencesForm initialPreferences={preferences} />
    </div>
  );
}
