import type { Metadata } from "next";
import { CommunityNewsForm } from "../CommunityNewsForm";
import styles from "../community-news-admin.module.css";

export const metadata: Metadata = { title: "יצירת כתבה | ניהול הפורטל", robots: { index: false, follow: false } };

export default function NewCommunityNewsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>יצירת כתבה</h1>
      </div>
      <CommunityNewsForm />
    </div>
  );
}
