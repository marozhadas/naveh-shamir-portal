import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunityNewsById } from "@/lib/admin/community-news";
import { CommunityNewsForm } from "../../CommunityNewsForm";
import styles from "../../community-news-admin.module.css";

export const metadata: Metadata = { title: "עריכת כתבה | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type EditCommunityNewsPageProps = { params: Promise<{ id: string }> };

export default async function EditCommunityNewsPage({ params }: EditCommunityNewsPageProps) {
  const { id } = await params;
  const article = await getCommunityNewsById(id);
  if (!article) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>עריכת כתבה — {article.title}</h1>
      </div>
      <CommunityNewsForm article={article} />
    </div>
  );
}
