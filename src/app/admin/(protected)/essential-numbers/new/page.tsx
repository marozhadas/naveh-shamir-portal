import type { Metadata } from "next";
import { EssentialNumberForm } from "../EssentialNumberForm";
import styles from "../essential-numbers-admin.module.css";

export const metadata: Metadata = { title: "הוספת מספר חיוני | ניהול הפורטל", robots: { index: false, follow: false } };

export default function NewEssentialNumberPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>הוספת מספר חיוני</h1>
      </div>
      <EssentialNumberForm />
    </div>
  );
}
