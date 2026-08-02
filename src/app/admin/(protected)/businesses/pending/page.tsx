import type { Metadata } from "next";
import { listPendingRegistrations } from "@/lib/admin/business-registrations";
import { BusinessRegistrationsListView } from "../BusinessRegistrationsListView";
import styles from "../businesses-list.module.css";

export const metadata: Metadata = { title: "עסקים חדשים | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPendingBusinessesPage() {
  const registrations = await listPendingRegistrations();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>עסקים חדשים שממתינים לאישור</h1>
      </div>
      <BusinessRegistrationsListView registrations={registrations} emptyMessage="אין כרגע עסקים שממתינים לאישור." />
    </div>
  );
}
