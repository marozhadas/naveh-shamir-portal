import type { Metadata } from "next";
import { EventForm } from "../EventForm";
import styles from "../events-admin.module.css";

export const metadata: Metadata = { title: "יצירת אירוע | ניהול הפורטל", robots: { index: false, follow: false } };

export default function NewEventPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>יצירת אירוע</h1>
      </div>
      <EventForm />
    </div>
  );
}
