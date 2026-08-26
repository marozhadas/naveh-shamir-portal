"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ChevronDown, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COMMUNITY_NEWS_STATUS_LABEL } from "@/types/community-news";
import { deleteCommunityNewsAction, setCommunityNewsStatusAction } from "./actions";
import type { CommunityNewsRow, CommunityNewsStatus } from "@/types/community-news";
import styles from "./community-news-admin.module.css";

type CommunityNewsAdminRowProps = {
  article: CommunityNewsRow;
  onUpdated: (article: CommunityNewsRow) => void;
  onDeleted: (id: string) => void;
};

export function CommunityNewsAdminRow({ article, onUpdated, onDeleted }: CommunityNewsAdminRowProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  function changeStatus(status: CommunityNewsStatus) {
    startTransition(async () => {
      await setCommunityNewsStatusAction(article.id, status);
      onUpdated({ ...article, status });
    });
  }

  function handleDelete() {
    if (!window.confirm(`למחוק לצמיתות את "${article.title}"? פעולה זו אינה הפיכה.`)) return;
    startTransition(async () => {
      await deleteCommunityNewsAction(article.id);
      onDeleted(article.id);
    });
  }

  return (
    <div className={`${styles.row} ${styles[`status_${article.status}`] ?? ""}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className={styles.row} style={{ border: "none", padding: 0 }}>
        <button
          type="button"
          className={styles.replaceButton}
          style={{ padding: "6px", border: "none", background: "transparent" }}
          aria-expanded={expanded}
          aria-label={expanded ? "הסתרת תצוגה מקדימה" : "תצוגה מקדימה"}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown size={18} aria-hidden="true" style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
        </button>

        <div className={styles.rowThumb}>
          {article.image_url ? (
            <Image src={article.image_url} alt={article.image_alt ?? article.title} fill sizes="56px" className={styles.rowThumbImage} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--slate-400)" }}>
              <ImageIcon size={20} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className={styles.rowInfo}>
          <span className={styles.rowTitle}>{article.title}</span>
          <span className={styles.rowMeta}>{article.excerpt}</span>
        </div>

        <span className={styles.statusBadge}>{COMMUNITY_NEWS_STATUS_LABEL[article.status]}</span>

        <div className={styles.rowActions}>
          <Button href={`/admin/community-news/${article.id}/edit`} variant="secondary" size="compact">
            עריכה
          </Button>
          {article.status === "published" ? (
            <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("draft")}>
              מעבר לטיוטה
            </Button>
          ) : (
            <Button variant="accent" size="compact" disabled={isPending} onClick={() => changeStatus("published")}>
              פרסום
            </Button>
          )}
          {article.status !== "archived" && (
            <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("archived")}>
              ארכוב
            </Button>
          )}
          <Button variant="secondary" size="compact" disabled={isPending} onClick={handleDelete}>
            מחיקה
          </Button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--color-border-default)", marginTop: "var(--space-3)", paddingTop: "var(--space-3)" }}>
          <p className={styles.rowMeta} style={{ marginBottom: "var(--space-2)", whiteSpace: "pre-wrap" }}>
            {article.body}
          </p>
          {article.status === "published" && (
            <Button href={`/news/${article.slug}`} variant="secondary" size="compact" target="_blank" rel="noopener noreferrer">
              צפייה בעמוד הציבורי
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
