"use client";

import { useMemo, useState } from "react";
import { COMMUNITY_NEWS_STATUS_LABEL } from "@/types/community-news";
import { CommunityNewsAdminRow } from "./CommunityNewsAdminRow";
import type { CommunityNewsRow, CommunityNewsStatus } from "@/types/community-news";
import styles from "./community-news-admin.module.css";

type StatusFilter = CommunityNewsStatus | "all";
const STATUS_OPTIONS: StatusFilter[] = ["all", "draft", "published", "archived"];

type CommunityNewsAdminListProps = {
  articles: CommunityNewsRow[];
};

export function CommunityNewsAdminList({ articles: initialArticles }: CommunityNewsAdminListProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  function updateArticle(updated: CommunityNewsRow) {
    setArticles((current) => current.map((a) => (a.id === updated.id ? updated : a)));
  }

  function removeArticle(id: string) {
    setArticles((current) => current.filter((a) => a.id !== id));
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return articles
      .filter((a) => status === "all" || a.status === status)
      .filter((a) => !normalizedQuery || a.title.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [articles, query, status]);

  return (
    <div>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="חיפוש לפי כותרת..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש כתבות" />
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="סינון לפי סטטוס">
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "כל הסטטוסים" : COMMUNITY_NEWS_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>לא נמצאו כתבות בסינון הזה.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((article) => (
            <CommunityNewsAdminRow key={article.id} article={article} onUpdated={updateArticle} onDeleted={removeArticle} />
          ))}
        </div>
      )}
    </div>
  );
}
