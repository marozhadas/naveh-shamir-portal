import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { listAllEvents } from "@/lib/admin/community-events";
import { EventsAdminList } from "./EventsAdminList";
import styles from "./events-admin.module.css";

export const metadata: Metadata = { title: "אירועים | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await listAllEvents();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>אירועים</h1>
        <Button href="/admin/events/new" variant="accent">
          יצירת אירוע
        </Button>
      </div>
      <EventsAdminList events={events} />
    </div>
  );
}
