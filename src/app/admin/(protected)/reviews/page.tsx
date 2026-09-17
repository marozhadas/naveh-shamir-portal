import type { Metadata } from "next";
import Link from "next/link";
import { listAllReviewsForAdmin } from "@/lib/admin/business-reviews";
import { BUSINESS_REVIEW_STATUS_LABEL } from "@/types/business-review";
import { ReviewAdminRow } from "./ReviewAdminRow";
import type { BusinessReviewStatus } from "@/types/business-review";
import styles from "./reviews-admin.module.css";

export const metadata: Metadata = { title: "ביקורות | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS_TABS: { value: BusinessReviewStatus | "all"; label: string }[] = [
  { value: "all", label: "הכול" },
  { value: "pending", label: BUSINESS_REVIEW_STATUS_LABEL.pending },
  { value: "approved", label: BUSINESS_REVIEW_STATUS_LABEL.approved },
  { value: "rejected", label: BUSINESS_REVIEW_STATUS_LABEL.rejected },
];

type ReviewsAdminPageProps = {
  searchParams: Promise<{ status?: string; businessId?: string }>;
};

export default async function AdminReviewsPage({ searchParams }: ReviewsAdminPageProps) {
  const { status, businessId } = await searchParams;
  const reviews = await listAllReviewsForAdmin();

  const activeStatus = STATUS_TABS.some((tab) => tab.value === status) ? (status as BusinessReviewStatus | "all") : "all";
  const activeBusinessId = businessId && businessId !== "all" ? businessId : "all";

  const businessOptions = Array.from(new Map(reviews.map((r) => [r.business_id, r.businessName])).entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "he"),
  );

  const filtered = reviews
    .filter((review) => activeStatus === "all" || review.status === activeStatus)
    .filter((review) => activeBusinessId === "all" || review.business_id === activeBusinessId);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ביקורות</h1>
      </div>

      <div className={styles.filtersRow}>
        <nav className={styles.tabs} aria-label="סינון לפי סטטוס">
          {STATUS_TABS.map((tab) => {
            const href = new URLSearchParams();
            if (tab.value !== "all") href.set("status", tab.value);
            if (activeBusinessId !== "all") href.set("businessId", activeBusinessId);
            const query = href.toString();
            return (
              <Link
                key={tab.value}
                href={query ? `/admin/reviews?${query}` : "/admin/reviews"}
                className={`${styles.tab} ${activeStatus === tab.value ? styles.tabActive : ""}`}
                aria-current={activeStatus === tab.value ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {businessOptions.length > 0 && (
          <form method="get" className={styles.businessFilterForm}>
            {activeStatus !== "all" && <input type="hidden" name="status" value={activeStatus} />}
            <label htmlFor="business-filter">עסק:</label>
            <select id="business-filter" name="businessId" defaultValue={activeBusinessId} className={styles.businessSelect}>
              <option value="all">כל העסקים</option>
              {businessOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <button type="submit" className={styles.tab}>
              סינון
            </button>
          </form>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>לא נמצאו ביקורות בסינון הזה.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((review) => (
            <ReviewAdminRow key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
