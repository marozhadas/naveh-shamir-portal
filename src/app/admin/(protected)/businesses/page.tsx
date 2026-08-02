import type { Metadata } from "next";
import Link from "next/link";
import { listAllRegistrations } from "@/lib/admin/business-registrations";
import { BusinessRegistrationsListView } from "./BusinessRegistrationsListView";
import type { BusinessRegistrationStatus } from "@/types/business-registration";
import styles from "./businesses-list.module.css";

export const metadata: Metadata = { title: "עסקים | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_TABS: { value: BusinessRegistrationStatus | "all"; label: string }[] = [
  { value: "all", label: "הכול" },
  { value: "pending", label: "ממתינים" },
  { value: "approved", label: "מאושרים" },
  { value: "rejected", label: "נדחו" },
];

type BusinessesPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminBusinessesPage({ searchParams }: BusinessesPageProps) {
  const { status } = await searchParams;
  const registrations = await listAllRegistrations();
  const activeStatus = STATUS_TABS.some((tab) => tab.value === status) ? (status as BusinessRegistrationStatus | "all") : "all";
  const filtered = activeStatus === "all" ? registrations : registrations.filter((r) => r.status === activeStatus);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>עסקים</h1>
        <nav className={styles.tabs} aria-label="סינון לפי סטטוס">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/admin/businesses" : `/admin/businesses?status=${tab.value}`}
              className={`${styles.tab} ${activeStatus === tab.value ? styles.tabActive : ""}`}
              aria-current={activeStatus === tab.value ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <BusinessRegistrationsListView registrations={filtered} emptyMessage="לא נמצאו עסקים בסינון הזה." />
    </div>
  );
}
