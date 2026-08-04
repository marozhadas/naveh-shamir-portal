import type { Metadata } from "next";
import Link from "next/link";
import { listAllMarketplaceListings } from "@/lib/admin/marketplace-listings";
import { MarketplaceAdminRow } from "./MarketplaceAdminRow";
import type { MarketplaceListingStatus } from "@/types/marketplace";
import { MARKETPLACE_STATUS_LABEL } from "@/types/marketplace";
import styles from "./marketplace-admin.module.css";

export const metadata: Metadata = { title: "מסירה ומכירה | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_TABS: { value: MarketplaceListingStatus | "all"; label: string }[] = [
  { value: "all", label: "הכול" },
  { value: "pending", label: MARKETPLACE_STATUS_LABEL.pending },
  { value: "active", label: MARKETPLACE_STATUS_LABEL.active },
  { value: "reserved", label: MARKETPLACE_STATUS_LABEL.reserved },
  { value: "delivered", label: MARKETPLACE_STATUS_LABEL.delivered },
  { value: "sold", label: MARKETPLACE_STATUS_LABEL.sold },
  { value: "removed", label: MARKETPLACE_STATUS_LABEL.removed },
];

type MarketplaceAdminPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminMarketplacePage({ searchParams }: MarketplaceAdminPageProps) {
  const { status } = await searchParams;
  const listings = await listAllMarketplaceListings();
  const activeStatus = STATUS_TABS.some((tab) => tab.value === status) ? (status as MarketplaceListingStatus | "all") : "all";
  const filtered = activeStatus === "all" ? listings : listings.filter((listing) => listing.status === activeStatus);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>מסירה ומכירה</h1>
      </div>

      <nav className={styles.tabs} aria-label="סינון לפי סטטוס">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/admin/marketplace" : `/admin/marketplace?status=${tab.value}`}
            className={`${styles.tab} ${activeStatus === tab.value ? styles.tabActive : ""}`}
            aria-current={activeStatus === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <p className={styles.empty}>לא נמצאו מודעות בסינון הזה.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((listing) => (
            <MarketplaceAdminRow key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
