"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ChevronDown, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EVENT_AUDIENCE_LABEL, EVENT_STATUS_LABEL } from "@/types/community-event";
import { formatEventDateShort, formatEventTimeRange } from "@/utils/format-event-date";
import { deleteEventAction, duplicateEventAction, setEventStatusAction } from "./actions";
import type { CommunityEventRow, EventStatus } from "@/types/community-event";
import styles from "./events-admin.module.css";

type EventAdminRowProps = {
  event: CommunityEventRow;
  onUpdated: (event: CommunityEventRow) => void;
  onDeleted: (id: string) => void;
  onDuplicated: (event: CommunityEventRow) => void;
};

export function EventAdminRow({ event, onUpdated, onDeleted, onDuplicated }: EventAdminRowProps) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  function changeStatus(status: EventStatus) {
    startTransition(async () => {
      await setEventStatusAction(event.id, status);
      onUpdated({ ...event, status });
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const created = await duplicateEventAction(event.id);
      onDuplicated(created);
    });
  }

  function handleDelete() {
    if (!window.confirm(`למחוק לצמיתות את "${event.title}"? פעולה זו אינה הפיכה.`)) return;
    startTransition(async () => {
      await deleteEventAction(event.id);
      onDeleted(event.id);
    });
  }

  return (
    <div className={`${styles.row} ${styles[`status_${event.status}`] ?? ""}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className={styles.row} style={{ border: "none", padding: 0 }}>
        <button type="button" className={styles.replaceButton} style={{ padding: "6px", border: "none", background: "transparent" }} aria-expanded={expanded} aria-label={expanded ? "הסתרת תצוגה מקדימה" : "תצוגה מקדימה"} onClick={() => setExpanded((v) => !v)}>
          <ChevronDown size={18} aria-hidden="true" style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
        </button>

        <div className={styles.rowThumb}>
          {event.image_url ? (
            <Image src={event.image_url} alt={event.image_alt ?? event.title} fill sizes="56px" className={styles.rowThumbImage} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--slate-400)" }}>
              <ImageIcon size={20} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className={styles.rowInfo}>
          <span className={styles.rowTitle}>
            {event.title}
            {event.featured && <span className={styles.featuredBadge}>★ מומלץ</span>}
          </span>
          <span className={styles.rowMeta}>
            {formatEventDateShort(event.event_date)} · {formatEventTimeRange(event.start_time, event.end_time)} · {event.audience.map((a) => EVENT_AUDIENCE_LABEL[a]).join(", ")} ·{" "}
            {event.is_free ? "חינם" : "בתשלום"}
          </span>
        </div>

        <span className={styles.statusBadge}>{EVENT_STATUS_LABEL[event.status]}</span>

        <div className={styles.rowActions}>
          <Button href={`/admin/events/${event.id}/edit`} variant="secondary" size="compact">
            עריכה
          </Button>
          {event.status === "published" ? (
            <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("draft")}>
              מעבר לטיוטה
            </Button>
          ) : (
            <Button variant="accent" size="compact" disabled={isPending} onClick={() => changeStatus("published")}>
              פרסום
            </Button>
          )}
          {event.status !== "canceled" && (
            <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("canceled")}>
              ביטול
            </Button>
          )}
          {event.status !== "archived" && (
            <Button variant="secondary" size="compact" disabled={isPending} onClick={() => changeStatus("archived")}>
              ארכוב
            </Button>
          )}
          <Button variant="secondary" size="compact" disabled={isPending} onClick={handleDuplicate}>
            שכפול
          </Button>
          <Button variant="secondary" size="compact" disabled={isPending} onClick={handleDelete}>
            מחיקה
          </Button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--color-border-default)", marginTop: "var(--space-3)", paddingTop: "var(--space-3)" }}>
          <p className={styles.rowMeta} style={{ marginBottom: "var(--space-2)" }}>
            {event.short_description}
          </p>
          <p className={styles.rowMeta}>
            {event.location_name}
            {event.address ? ` · ${event.address}` : ""}
          </p>
          {event.registration_url && <p className={styles.rowMeta}>קישור הרשמה: {event.registration_url}</p>}
          {event.status === "published" && (
            <Button href={`/events/${event.slug}`} variant="secondary" size="compact" target="_blank" rel="noopener noreferrer">
              צפייה בעמוד הציבורי
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
