import type { Metadata } from "next";
import { listAllContactMessages } from "@/lib/admin/contact-messages";
import { ContactMessagesAdminList } from "./ContactMessagesAdminList";
import styles from "./contact-admin.module.css";

export const metadata: Metadata = { title: "פניות | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminContactPage() {
  const entries = await listAllContactMessages();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>פניות</h1>
      </div>
      <ContactMessagesAdminList entries={entries} />
    </div>
  );
}
