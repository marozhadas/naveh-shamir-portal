import type { Metadata } from "next";
import Link from "next/link";
import { getBusinessAnalyticsForOwner } from "@/repositories/analytics-service";
import { isBusinessAnalyticsWindow, BUSINESS_ANALYTICS_WINDOWS, BUSINESS_ANALYTICS_WINDOW_LABEL } from "@/utils/business-analytics-window";
import { isSupabaseBusinessId, toRegistrationId } from "@/utils/business-id";
import { resolveDashboardViewer } from "../resolve-dashboard-viewer";
import { TrendChart } from "./TrendChart";
import styles from "./analytics.module.css";
import type { BusinessAnalyticsWindow } from "@/utils/business-analytics-window";

export const metadata: Metadata = { title: "אנליטיקה | דשבורד | נווה שמיר", robots: { index: false, follow: false } };

type AnalyticsPageProps = { searchParams: Promise<{ window?: string }> };

/**
 * `window` is the only thing this page ever reads from client-controlled input, and it's
 * whitelisted against the 4 known values (default "30d") before use — it only ever narrows the
 * TIME RANGE of the query, never which business's data is fetched. The business itself is always
 * `view.business.id`, derived exclusively from the signed-in owner's own session via
 * resolveDashboardViewer — there is no code path here that reads a businessId from the URL, form
 * data, or any other client input (spec: no IDOR via a manually-supplied businessId).
 */
export default async function BusinessAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const view = await resolveDashboardViewer();

  if (view.kind !== "ready") {
    return <p className={styles.notice}>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לצפות באנליטיקה.</p>;
  }

  if (view.business.activePlanId === "basic") {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>אנליטיקה</h1>
        <p className={styles.notice}>אנליטיקה לעסק זמינה למנויי Plus ו-Premium בלבד. אפשר לשדרג את החבילה מעמוד המנוי.</p>
      </div>
    );
  }

  const rawWindow = (await searchParams).window;
  const window: BusinessAnalyticsWindow = isBusinessAnalyticsWindow(rawWindow) ? rawWindow : "30d";

  if (!isSupabaseBusinessId(view.business.id)) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>אנליטיקה</h1>
        <p className={styles.notice}>אין עדיין נתוני אנליטיקה אמיתיים להצגה עבור עסק הדגמה זה.</p>
      </div>
    );
  }

  const summary = await getBusinessAnalyticsForOwner(toRegistrationId(view.business.id), window);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>אנליטיקה</h1>
      <p className={styles.disclaimer}>הנתונים מציגים צפיות ולחיצות באתר ואינם מעידים בהכרח על פנייה או עסקה שהושלמה.</p>

      <div className={styles.filterRow}>
        {BUSINESS_ANALYTICS_WINDOWS.map((option) => (
          <Link key={option} href={`?window=${option}`} className={`${styles.filterLink} ${option === window ? styles.filterLinkActive : ""}`}>
            {BUSINESS_ANALYTICS_WINDOW_LABEL[option]}
          </Link>
        ))}
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.totalViews}</span>
          <span className={styles.summaryLabel}>צפיות בעמוד העסק</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.totalPhoneClicks}</span>
          <span className={styles.summaryLabel}>לחיצות טלפון</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.totalWhatsappClicks}</span>
          <span className={styles.summaryLabel}>לחיצות וואטסאפ</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.totalWebsiteClicks}</span>
          <span className={styles.summaryLabel}>לחיצות לאתר</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.totalInstagramClicks}</span>
          <span className={styles.summaryLabel}>לחיצות אינסטגרם</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.totalFacebookClicks}</span>
          <span className={styles.summaryLabel}>לחיצות פייסבוק</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>מגמה לאורך זמן</h2>
        <TrendChart trend={summary.trend} />
      </div>
    </div>
  );
}
