"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildGoogleCalendarUrl, buildIcsContent } from "@/utils/event-calendar-links";
import type { CommunityEventRow } from "@/types/community-event";
import styles from "./event-detail.module.css";

type AddToCalendarButtonProps = {
  event: Pick<CommunityEventRow, "id" | "title" | "short_description" | "event_date" | "start_time" | "end_time" | "location_name">;
  pageUrl: string;
};

export function AddToCalendarButton({ event, pageUrl }: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false);

  function downloadIcs() {
    const content = buildIcsContent(event, pageUrl, `${event.id}@naveh-shamir-portal`);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <div className={styles.calendarWrap}>
      <Button variant="secondary" icon={<CalendarPlus size={16} aria-hidden="true" />} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        הוספה ליומן
      </Button>
      {open && (
        <div className={styles.calendarMenu} role="menu">
          <a href={buildGoogleCalendarUrl(event, pageUrl)} target="_blank" rel="noopener noreferrer" className={styles.calendarOption} role="menuitem">
            Google Calendar
          </a>
          <button type="button" className={styles.calendarOption} onClick={downloadIcs} role="menuitem">
            הורדת קובץ ICS
          </button>
        </div>
      )}
    </div>
  );
}
