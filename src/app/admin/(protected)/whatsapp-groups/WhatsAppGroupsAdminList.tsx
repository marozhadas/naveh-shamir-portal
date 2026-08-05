"use client";

import { useMemo, useState } from "react";
import { WHATSAPP_GROUP_CATEGORY_LABEL, WHATSAPP_GROUP_CATEGORY_OPTIONS, WHATSAPP_GROUP_STATUS_LABEL } from "@/types/whatsapp-group";
import { WhatsAppGroupAdminRow } from "./WhatsAppGroupAdminRow";
import type { WhatsAppGroupCategory, WhatsAppGroupRow, WhatsAppGroupStatus } from "@/types/whatsapp-group";
import styles from "./whatsapp-groups-admin.module.css";

type StatusFilter = WhatsAppGroupStatus | "all";
const STATUS_OPTIONS: StatusFilter[] = ["all", "draft", "published", "archived"];

type WhatsAppGroupsAdminListProps = {
  entries: WhatsAppGroupRow[];
};

export function WhatsAppGroupsAdminList({ entries: initialEntries }: WhatsAppGroupsAdminListProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<WhatsAppGroupCategory | "">("");

  function updateEntry(updated: WhatsAppGroupRow) {
    setEntries((current) => current.map((e) => (e.id === updated.id ? updated : e)));
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((e) => e.id !== id));
  }

  function addEntry(created: WhatsAppGroupRow) {
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
        <input className={styles.searchInput} placeholder="חיפוש לפי שם..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש קבוצות" />
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="סינון לפי סטטוס">
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "כל הסטטוסים" : WHATSAPP_GROUP_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={category} onChange={(e) => setCategory(e.target.value as WhatsAppGroupCategory | "")} aria-label="סינון לפי קטגוריה">
          <option value="">כל הקטגוריות</option>
          {WHATSAPP_GROUP_CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {WHATSAPP_GROUP_CATEGORY_LABEL[option]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>לא נמצאו קבוצות בסינון הזה.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((entry, index) => (
            <WhatsAppGroupAdminRow
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
