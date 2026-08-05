import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { listAllWhatsAppGroups } from "@/lib/admin/whatsapp-groups";
import { WhatsAppGroupsAdminList } from "./WhatsAppGroupsAdminList";
import styles from "./whatsapp-groups-admin.module.css";

export const metadata: Metadata = { title: "קבוצות WhatsApp | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminWhatsAppGroupsPage() {
  const entries = await listAllWhatsAppGroups();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>קבוצות WhatsApp</h1>
        <Button href="/admin/whatsapp-groups/new" variant="accent">
          הוספת קבוצה
        </Button>
      </div>
      <WhatsAppGroupsAdminList entries={entries} />
    </div>
  );
}
