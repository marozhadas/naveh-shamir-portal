"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { CONTACT_MESSAGE_STATUS_LABEL, CONTACT_MESSAGE_SUBJECT_TYPE_LABEL } from "@/types/contact-message";
import { deleteContactMessageAction, setContactMessageStatusAction } from "./actions";
import type { ContactMessageRow, ContactMessageStatus } from "@/types/contact-message";
import styles from "./contact-admin.module.css";

type ContactMessageAdminRowProps = {
  entry: ContactMessageRow;
  onUpdated: (entry: ContactMessageRow) => void;
  onDeleted: (id: string) => void;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ContactMessageAdminRow({ entry, onUpdated, onDeleted }: ContactMessageAdminRowProps) {
  const [isPending, startTransition] = useTransition();

  function changeStatus(status: ContactMessageStatus) {
    startTransition(async () => {
      await setContactMessageStatusAction(entry.id, status);
      onUpdated({ ...entry, status });
    });
  }

  function handleDelete() {
    if (!window.confirm(`למחוק לצמיתות את הפנייה של "${entry.full_name}"? הפעולה אינה הפיכה.`)) return;
    startTransition(async () => {
      await deleteContactMessageAction(entry.id);
      onDeleted(entry.id);
    });
  }

  const statusClass = styles[`status_${entry.status}` as keyof typeof styles] ?? "";

  return (
    <div className={`${styles.row} ${statusClass}`}>
      <div className={styles.rowInfo}>
        <span className={styles.rowTitle}>{entry.subject}</span>
        <span className={styles.rowMeta}>
          {entry.full_name} · {entry.email}
          {entry.whatsapp ? ` · ${entry.whatsapp}` : ""} · {CONTACT_MESSAGE_SUBJECT_TYPE_LABEL[entry.subject_type]} · {formatDate(entry.created_at)}
        </span>
        <p className={styles.rowPreview}>{entry.message}</p>
      </div>

      <span className={styles.statusBadge}>{CONTACT_MESSAGE_STATUS_LABEL[entry.status]}</span>

      <div className={styles.rowActions}>
        <Button href={`/admin/contact/${entry.id}`} variant="secondary" size="compact">
          פתיחה
        </Button>
        {entry.status !== "in-progress" && (
          <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("in-progress")}>
            סימון כבטיפול
          </Button>
        )}
        {entry.status !== "closed" && (
          <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("closed")}>
            סימון כנסגר
          </Button>
        )}
        {entry.status !== "spam" && (
          <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("spam")}>
            סימון כספאם
          </Button>
        )}
        <Button variant="secondary" size="compact" disabled={isPending} onClick={handleDelete}>
          מחיקה
        </Button>
      </div>
    </div>
  );
}
