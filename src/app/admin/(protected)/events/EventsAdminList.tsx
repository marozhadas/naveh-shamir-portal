"use client";

import { useMemo, useState } from "react";
import { EVENT_AUDIENCE_LABEL, EVENT_AUDIENCE_OPTIONS, EVENT_STATUS_LABEL } from "@/types/community-event";
import { EventAdminRow } from "./EventAdminRow";
import type { CommunityEventRow, EventStatus } from "@/types/community-event";
import styles from "./events-admin.module.css";

type StatusFilter = EventStatus | "all";
const STATUS_OPTIONS: StatusFilter[] = ["all", "draft", "published", "canceled", "archived"];

type EventsAdminListProps = {
  events: CommunityEventRow[];
};

export function EventsAdminList({ events: initialEvents }: EventsAdminListProps) {
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [audience, setAudience] = useState<string>("");

  function updateEvent(updated: CommunityEventRow) {
    setEvents((current) => current.map((e) => (e.id === updated.id ? updated : e)));
  }

  function removeEvent(id: string) {
    setEvents((current) => current.filter((e) => e.id !== id));
  }

  function addEvent(created: CommunityEventRow) {
    setEvents((current) => [...current, created]);
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events
      .filter((e) => status === "all" || e.status === status)
      .filter((e) => !audience || e.audience.includes(audience as CommunityEventRow["audience"][number]))
      .filter((e) => !normalizedQuery || `${e.title} ${e.location_name}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => (a.event_date === b.event_date ? a.start_time.localeCompare(b.start_time) : a.event_date.localeCompare(b.event_date)));
  }, [events, query, status, audience]);

  return (
    <div>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="חיפוש לפי שם או מקום..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="חיפוש אירועים" />
        <select className={styles.filterSelect} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="סינון לפי סטטוס">
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "כל הסטטוסים" : EVENT_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
        <select className={styles.filterSelect} value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="סינון לפי קהל יעד">
          <option value="">כל הקהלים</option>
          {EVENT_AUDIENCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {EVENT_AUDIENCE_LABEL[option]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>לא נמצאו אירועים בסינון הזה.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((event) => (
            <EventAdminRow key={event.id} event={event} onUpdated={updateEvent} onDeleted={removeEvent} onDuplicated={addEvent} />
          ))}
        </div>
      )}
    </div>
  );
}
