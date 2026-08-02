import type { Metadata } from "next";
import { listPendingRegistrations } from "@/lib/admin/business-registrations";
import { getAdminSubscriptionSummary } from "@/lib/admin/subscription-summary";
import { BusinessRegistrationsListView } from "../BusinessRegistrationsListView";
import styles from "../businesses-list.module.css";

export const metadata: Metadata = { title: "עסקים חדשים | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPendingBusinessesPage() {
  const registrations = await listPendingRegistrations();
  const now = new Date();
  const summaries = await Promise.all(registrations.map((registration) => getAdminSubscriptionSummary(registration, now)));
  const rows = registrations.map((registration, index) => ({ registration, summary: summaries[index] }));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>עסקים חדשים שממתינים לאישור</h1>
      </div>
      <BusinessRegistrationsListView rows={rows} emptyMessage="אין כרגע עסקים שממתינים לאישור." />
    </div>
  );
}
