import Image from "next/image";
import { ArrowLeft, Newspaper } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatNewsDateFull } from "@/utils/format-news-date";
import type { CommunityNewsRow } from "@/types/community-news";
import styles from "./NewsCard.module.css";

type NewsCardProps = {
  article: CommunityNewsRow;
  /**
   * "grid" (default) is the full vertical card used on /news — image full-width on top. "teaser"
   * is the compact homepage layout: a fixed 15vw×10vw image on the right (first in DOM, matching
   * this project's RTL convention — see CommunityPulseSection) and the text to its left.
   */
  variant?: "grid" | "teaser";
};

export function NewsCard({ article, variant = "grid" }: NewsCardProps) {
  const href = `/news/${article.slug}`;
  const isTeaser = variant === "teaser";

  const imageContent = article.image_url ? (
    <Image
      src={article.image_url}
      alt={article.image_alt ?? article.title}
      fill
      sizes={isTeaser ? "15vw" : "(max-width: 640px) 100vw, 33vw"}
      className={styles.image}
    />
  ) : (
    <div className={styles.imagePlaceholder} aria-hidden="true">
      <Newspaper size={isTeaser ? 24 : 36} strokeWidth={1.5} />
    </div>
  );

  return (
    <Card noPadding className={`${styles.card} ${isTeaser ? styles.teaserCard : ""}`} data-testid="news-card">
      <a href={href} className={`${styles.imageArea} ${isTeaser ? styles.teaserImageArea : ""}`} aria-label={article.title}>
        {imageContent}
      </a>
      <div className={`${styles.body} ${isTeaser ? styles.teaserBody : ""}`}>
        {article.published_at && <span className={styles.date}>{formatNewsDateFull(article.published_at)}</span>}
        <h3 className={styles.title}>
          <a href={href}>{article.title}</a>
        </h3>
        <p className={styles.excerpt}>{article.excerpt}</p>
        <Button href={href} variant="secondary" size="compact" icon={<ArrowLeft size={15} aria-hidden="true" />} className={styles.readMore}>
          קרא עוד
        </Button>
      </div>
    </Card>
  );
}
