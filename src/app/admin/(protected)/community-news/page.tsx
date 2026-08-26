import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { listAllCommunityNews } from "@/lib/admin/community-news";
import { CommunityNewsAdminList } from "./CommunityNewsAdminList";
import styles from "./community-news-admin.module.css";

export const metadata: Metadata = { title: "חדשות השכונה | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminCommunityNewsPage() {
  const articles = await listAllCommunityNews();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>חדשות השכונה</h1>
        <Button href="/admin/community-news/new" variant="accent">
          הוספת כתבה
        </Button>
      </div>
      <CommunityNewsAdminList articles={articles} />
    </div>
  );
}
