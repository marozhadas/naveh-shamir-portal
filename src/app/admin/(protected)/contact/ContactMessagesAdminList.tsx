"use client";

import { useMemo, useState } from "react";
import { CONTACT_MESSAGE_STATUS_LABEL } from "@/types/contact-message";
import { ContactMessageAdminRow } from "./ContactMessageAdminRow";
import type { ContactMessageRow, ContactMessageStatus } from "@/types/contact-message";
import styles from "./contact-admin.module.css";

type StatusFilter = ContactMessageStatus | "all";
type KindFilter = "all" | "feedback" | "contact";
const STATUS_OPTIONS: StatusFilter[] = ["all", "new", "in-progress", "closed", "spam"];

type ContactMessagesAdminListProps = {
  entries: ContactMessageRow[];
};

export function ContactMessagesAdminList({ entries: initialEntries }: ContactMessagesAdminListProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");

  function updateEntry(updated: ContactMessageRow) {
    setEntries((current) => current.map((e) => (e.id === updated.id ? updated : e)));
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((e) => e.id !== id));
  }

  const filtered = useMemo(() => entries.filter((e) => (status === "all" || e.status === status) && (kind === "all" || (kind === "feedback") === (e.subject_type === "feedback"))), [entries, status, kind]);

  return (
    <div>
      <div className={styles.toolbar}>
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="סינון לפי סטטוס">
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "כל הסטטוסים" : CONTACT_MESSAGE_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={kind} onChange={(e) => setKind(e.target.value as KindFilter)} aria-label="סינון לפי סוג">
          <option value="all">כל הסוגים</option>
          <option value="contact">פניות מטופס יצירת קשר</option>
          <option value="feedback">משוב מהאתר</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>לא נמצאו פניות בסינון הזה.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((entry) => (
            <ContactMessageAdminRow key={entry.id} entry={entry} onUpdated={updateEntry} onDeleted={removeEntry} />
          ))}
        </div>
      )}
    </div>
  );
}
