import Image from "next/image";
import { ArrowLeft, Newspaper } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatNewsDateFull } from "@/utils/format-news-date";
import type { CommunityNewsRow } from "@/types/community-news";
import styles from "./NewsCard.module.css";

type NewsCardProps = {
  article: CommunityNewsRow;
};

export function NewsCard({ article }: NewsCardProps) {
  const href = `/news/${article.slug}`;

  return (
    <Card noPadding className={styles.card} data-testid="news-card">
      <a href={href} className={styles.imageArea} aria-label={article.title}>
        {article.image_url ? (
          <Image src={article.image_url} alt={article.image_alt ?? article.title} fill sizes="(max-width: 640px) 100vw, 33vw" className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true">
            <Newspaper size={36} strokeWidth={1.5} />
          </div>
        )}
      </a>
      <div className={styles.body}>
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
