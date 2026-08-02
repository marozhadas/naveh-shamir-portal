import type { Metadata } from "next";
import Link from "next/link";
import { listAllRegistrations } from "@/lib/admin/business-registrations";
import { getAdminSubscriptionSummary, matchesSubscriptionFilter, ADMIN_SUBSCRIPTION_FILTER_TABS } from "@/lib/admin/subscription-summary";
import { BusinessRegistrationsListView } from "./BusinessRegistrationsListView";
import type { AdminSubscriptionFilter } from "@/lib/admin/subscription-summary";
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
  searchParams: Promise<{ status?: string; tier?: string }>;
};

function buildHref(status: string, tier: string): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (tier !== "all") params.set("tier", tier);
  const query = params.toString();
  return query ? `/admin/businesses?${query}` : "/admin/businesses";
}

export default async function AdminBusinessesPage({ searchParams }: BusinessesPageProps) {
  const { status, tier } = await searchParams;
  const registrations = await listAllRegistrations();
  const activeStatus = STATUS_TABS.some((tab) => tab.value === status) ? (status as BusinessRegistrationStatus | "all") : "all";
  const activeTier = ADMIN_SUBSCRIPTION_FILTER_TABS.some((tab) => tab.value === tier) ? (tier as AdminSubscriptionFilter) : "all";

  const byStatus = activeStatus === "all" ? registrations : registrations.filter((r) => r.status === activeStatus);

  const now = new Date();
  const summaries = await Promise.all(byStatus.map((registration) => getAdminSubscriptionSummary(registration, now)));
  const rows = byStatus.map((registration, index) => ({ registration, summary: summaries[index] }));
  const filteredRows = activeTier === "all" ? rows : rows.filter(({ summary }) => matchesSubscriptionFilter(summary, activeTier));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>עסקים</h1>
      </div>

      <nav className={styles.tabs} aria-label="סינון לפי סטטוס אישור">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref(tab.value, activeTier)}
            className={`${styles.tab} ${activeStatus === tab.value ? styles.tabActive : ""}`}
            aria-current={activeStatus === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <nav className={styles.tabs} aria-label="סינון לפי סוג מנוי">
        {ADMIN_SUBSCRIPTION_FILTER_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref(activeStatus, tab.value)}
            className={`${styles.tab} ${activeTier === tab.value ? styles.tabActive : ""}`}
            aria-current={activeTier === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <BusinessRegistrationsListView rows={filteredRows} emptyMessage="לא נמצאו עסקים בסינון הזה." />
    </div>
  );
}
