import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Newspaper, ArrowLeft } from "lucide-react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { getNewsBySlug } from "@/repositories/community-news-service";
import { formatNewsDateFull } from "@/utils/format-news-date";
import { getSiteOrigin } from "@/utils/site-origin";
import styles from "./news-detail.module.css";

type NewsPageProps = { params: Promise<{ slug: string }> };

/**
 * Next.js's dynamic route params are supposed to already be URL-decoded, but for a non-ASCII
 * (e.g. Hebrew) slug this build inconsistently hands the page component the still-percent-encoded
 * string — see the identical fix in events/[slug], businesses/[slug], and marketplace/[slug].
 */
function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const article = await getNewsBySlug(slug);
  if (!article) return { title: "הכתבה לא נמצאה | חדשות השכונה בנווה שמיר", robots: { index: false, follow: false } };

  const title = `${article.title} | חדשות השכונה בנווה שמיר`;
  const description = article.excerpt.slice(0, 160);
  const url = `${getSiteOrigin()}/news/${article.slug}`;

  if (article.status !== "published") {
    return { title, description, robots: { index: false, follow: false } };
  }

  return {
    title,
    description,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      url,
      images: article.image_url ? [{ url: article.image_url }] : undefined,
      locale: "he_IL",
      type: "article",
    },
  };
}

export default async function NewsDetailPage({ params }: NewsPageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const article = await getNewsBySlug(slug);
  if (!article) notFound();

  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader
          breadcrumbs={[{ label: "בית", href: "/" }, { label: "חדשות השכונה", href: "/news" }, { label: article.title }]}
          title={article.title}
          description={article.excerpt}
        />

        <div className={styles.container}>
          {article.image_url ? (
            <div className={styles.imageWrap}>
              <Image src={article.image_url} alt={article.image_alt ?? article.title} fill sizes="(max-width: 800px) 100vw, 800px" className={styles.image} priority />
            </div>
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden="true">
              <Newspaper size={48} strokeWidth={1.5} />
            </div>
          )}

          {article.published_at && <p className={styles.dateLine}>{formatNewsDateFull(article.published_at)}</p>}

          <p className={styles.body}>{article.body}</p>

          <div className={styles.backLinkWrap}>
            <Button href="/news" variant="secondary" icon={<ArrowLeft size={15} aria-hidden="true" />}>
              לכל החדשות
            </Button>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
