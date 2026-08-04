import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/admin/community-events";
import { EventForm } from "../../EventForm";
import styles from "../../events-admin.module.css";

export const metadata: Metadata = { title: "עריכת אירוע | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type EditEventPageProps = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>עריכת אירוע — {event.title}</h1>
      </div>
      <EventForm event={event} />
    </div>
  );
}
