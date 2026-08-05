import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWhatsAppGroupById } from "@/lib/admin/whatsapp-groups";
import { WhatsAppGroupForm } from "../../WhatsAppGroupForm";
import styles from "../../whatsapp-groups-admin.module.css";

export const metadata: Metadata = { title: "עריכת קבוצת WhatsApp | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type EditWhatsAppGroupPageProps = { params: Promise<{ id: string }> };

export default async function EditWhatsAppGroupPage({ params }: EditWhatsAppGroupPageProps) {
  const { id } = await params;
  const entry = await getWhatsAppGroupById(id);
  if (!entry) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>עריכת קבוצה — {entry.name}</h1>
      </div>
      <WhatsAppGroupForm entry={entry} />
    </div>
  );
}
