import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { listAllEssentialNumbers } from "@/lib/admin/essential-numbers";
import { EssentialNumbersAdminList } from "./EssentialNumbersAdminList";
import styles from "./essential-numbers-admin.module.css";

export const metadata: Metadata = { title: "מספרים חיוניים | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminEssentialNumbersPage() {
  const entries = await listAllEssentialNumbers();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>מספרים חיוניים</h1>
        <Button href="/admin/essential-numbers/new" variant="accent">
          הוספת מספר
        </Button>
      </div>
      <EssentialNumbersAdminList entries={entries} />
    </div>
  );
}
