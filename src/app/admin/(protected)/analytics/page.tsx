import type { Metadata } from "next";
import { getAnalyticsSummary } from "@/repositories/analytics-service";
import styles from "./analytics.module.css";

export const metadata: Metadata = { title: "אנליטיקה | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const summary = await getAnalyticsSummary();

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>אנליטיקה</h1>
        <p className={styles.subtitle}>חשיפה ופניות בפורטל — ללא מידע אישי, רק כדי להראות לבעלי עסקים שהם מקבלים תנועה.</p>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.totalViews}</span>
          <span className={styles.summaryLabel}>צפיות בעמודי עסק</span>
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
          <span className={styles.summaryValue}>{summary.totalSearches}</span>
          <span className={styles.summaryLabel}>חיפושים בפורטל</span>
        </div>
      </div>

      <section className={styles.section} aria-labelledby="top-businesses-heading">
        <h2 id="top-businesses-heading" className={styles.sectionTitle}>
          עסקים לפי חשיפה
        </h2>
        {summary.topBusinesses.length === 0 ? (
          <p className={styles.empty}>עדיין אין נתונים.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>עסק</th>
                <th>צפיות</th>
                <th>טלפון</th>
                <th>וואטסאפ</th>
              </tr>
            </thead>
            <tbody>
              {summary.topBusinesses.map((row) => (
                <tr key={row.businessId}>
                  <td>{row.businessName}</td>
                  <td className={styles.numCell}>{row.views}</td>
                  <td className={styles.numCell}>{row.phoneClicks}</td>
                  <td className={styles.numCell}>{row.whatsappClicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section} aria-labelledby="top-categories-heading">
        <h2 id="top-categories-heading" className={styles.sectionTitle}>
          קטגוריות פופולריות
        </h2>
        {summary.topCategories.length === 0 ? (
          <p className={styles.empty}>עדיין אין נתונים.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>קטגוריה</th>
                <th>צפיות</th>
              </tr>
            </thead>
            <tbody>
              {summary.topCategories.map((row) => (
                <tr key={row.category}>
                  <td>{row.category}</td>
                  <td className={styles.numCell}>{row.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section} aria-labelledby="top-searches-heading">
        <h2 id="top-searches-heading" className={styles.sectionTitle}>
          חיפושים נפוצים בפורטל
        </h2>
        {summary.topSearches.length === 0 ? (
          <p className={styles.empty}>עדיין אין נתונים.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>מילת חיפוש</th>
                <th>פעמים</th>
              </tr>
            </thead>
            <tbody>
              {summary.topSearches.map((row) => (
                <tr key={row.query}>
                  <td>{row.query}</td>
                  <td className={styles.numCell}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
