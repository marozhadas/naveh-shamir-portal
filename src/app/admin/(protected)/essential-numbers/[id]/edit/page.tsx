import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEssentialNumberById } from "@/lib/admin/essential-numbers";
import { EssentialNumberForm } from "../../EssentialNumberForm";
import styles from "../../essential-numbers-admin.module.css";

export const metadata: Metadata = { title: "עריכת מספר חיוני | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type EditEssentialNumberPageProps = { params: Promise<{ id: string }> };

export default async function EditEssentialNumberPage({ params }: EditEssentialNumberPageProps) {
  const { id } = await params;
  const entry = await getEssentialNumberById(id);
  if (!entry) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>עריכת מספר — {entry.name}</h1>
      </div>
      <EssentialNumberForm entry={entry} />
    </div>
  );
}
