"use client";

import { useMemo, useState } from "react";
import { ESSENTIAL_NUMBER_CATEGORY_LABEL, ESSENTIAL_NUMBER_CATEGORY_OPTIONS, ESSENTIAL_NUMBER_STATUS_LABEL } from "@/types/essential-number";
import { EssentialNumberAdminRow } from "./EssentialNumberAdminRow";
import type { EssentialNumberCategory, EssentialNumberRow, EssentialNumberStatus } from "@/types/essential-number";
import styles from "./essential-numbers-admin.module.css";

type StatusFilter = EssentialNumberStatus | "all";
const STATUS_OPTIONS: StatusFilter[] = ["all", "draft", "published", "archived"];

type EssentialNumbersAdminListProps = {
  entries: EssentialNumberRow[];
};

export function EssentialNumbersAdminList({ entries: initialEntries }: EssentialNumbersAdminListProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<EssentialNumberCategory | "">("");

  function updateEntry(updated: EssentialNumberRow) {
    setEntries((current) => current.map((e) => (e.id === updated.id ? updated : e)));
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((e) => e.id !== id));
  }

  function addEntry(created: EssentialNumberRow) {
    setEntries((current) => [...current, created]);
  }

  function swapAdjacent(id: string, direction: "up" | "down") {
    setEntries((current) => {
      const sorted = [...current].sort((a, b) => b.priority - a.priority);
      const index = sorted.findIndex((e) => e.id === id);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return current;
      const a = sorted[index];
      const b = sorted[swapIndex];
      return current.map((e) => {
        if (e.id === a.id) return { ...e, priority: b.priority };
        if (e.id === b.id) return { ...e, priority: a.priority };
        return e;
      });
    });
  }

  const isDefaultView = !query.trim() && status === "all" && !category;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries
      .filter((e) => status === "all" || e.status === status)
      .filter((e) => !category || e.category === category)
      .filter((e) => !normalizedQuery || `${e.name} ${e.description ?? ""}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => b.priority - a.priority);
  }, [entries, query, status, category]);

  return (
    <div>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="חיפוש לפי שם..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש מספרים" />
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="סינון לפי סטטוס">
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "כל הסטטוסים" : ESSENTIAL_NUMBER_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={category} onChange={(e) => setCategory(e.target.value as EssentialNumberCategory | "")} aria-label="סינון לפי קטגוריה">
          <option value="">כל הקטגוריות</option>
          {ESSENTIAL_NUMBER_CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ESSENTIAL_NUMBER_CATEGORY_LABEL[option]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>לא נמצאו מספרים בסינון הזה.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((entry, index) => (
            <EssentialNumberAdminRow
              key={entry.id}
              entry={entry}
              onUpdated={updateEntry}
              onDeleted={removeEntry}
              onDuplicated={addEntry}
              onMoved={swapAdjacent}
              canReorder={isDefaultView}
              isFirst={index === 0}
              isLast={index === filtered.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
