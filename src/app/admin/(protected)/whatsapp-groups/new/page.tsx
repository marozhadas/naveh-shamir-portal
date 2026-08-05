import type { Metadata } from "next";
import { WhatsAppGroupForm } from "../WhatsAppGroupForm";
import styles from "../whatsapp-groups-admin.module.css";

export const metadata: Metadata = { title: "הוספת קבוצת WhatsApp | ניהול הפורטל", robots: { index: false, follow: false } };

export default function NewWhatsAppGroupPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>הוספת קבוצת WhatsApp</h1>
      </div>
      <WhatsAppGroupForm />
    </div>
  );
}
