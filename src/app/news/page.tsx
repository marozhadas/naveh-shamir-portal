import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { NewsCard } from "@/components/news/NewsCard/NewsCard";
import { getPublishedNews } from "@/repositories/community-news-service";
import styles from "./news.module.css";

const PAGE_TITLE = "חדשות השכונה | הפורטל של נווה שמיר";
const PAGE_DESCRIPTION = "עדכונים וכתבות מהשכונה, במקום אחד.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/news" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

// Reads live, admin-published news from Supabase on every request.
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const articles = await getPublishedNews();

  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "חדשות השכונה" }]} title="חדשות השכונה" description={PAGE_DESCRIPTION} />
        <div className={styles.container}>
          {articles.length === 0 ? (
            <div className={styles.empty} role="status">
              <Newspaper size={40} strokeWidth={1.5} aria-hidden="true" className={styles.emptyIcon} />
              <h2 className={styles.emptyTitle}>אין כרגע חדשות להצגה</h2>
              <p>כתבות חדשות יופיעו כאן בקרוב.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {articles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
