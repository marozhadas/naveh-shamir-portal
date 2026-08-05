import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContactMessageById } from "@/lib/admin/contact-messages";
import { getAuditLogForEntity } from "@/lib/admin/audit-log";
import { CONTACT_MESSAGE_STATUS_LABEL, CONTACT_MESSAGE_SUBJECT_TYPE_LABEL } from "@/types/contact-message";
import { ContactMessageDetailActions } from "../ContactMessageDetailActions";
import styles from "../contact-admin.module.css";

export const metadata: Metadata = { title: "פנייה | ניהול הפורטל", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const AUDIT_ACTION_LABEL: Record<string, string> = {
  "contact-message-status-updated": "סטטוס עודכן",
  "contact-message-deleted": "הפנייה נמחקה",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminContactMessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [entry, auditLog] = await Promise.all([getContactMessageById(id), getAuditLogForEntity("contact-message", id)]);

  if (!entry) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.detailCard}>
        <div className={styles.detailHeader}>
          <div>
            <h1 className={styles.detailSubject}>{entry.subject}</h1>
            <p className={styles.detailMeta}>
              {CONTACT_MESSAGE_SUBJECT_TYPE_LABEL[entry.subject_type]} · {formatDate(entry.created_at)}
            </p>
          </div>
          <span className={styles.statusBadge}>{CONTACT_MESSAGE_STATUS_LABEL[entry.status]}</span>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.detailField}>
            <span className={styles.detailFieldLabel}>שם מלא</span>
            <span className={styles.detailFieldValue}>{entry.full_name}</span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailFieldLabel}>כתובת מייל</span>
            <span className={styles.detailFieldValue} dir="ltr">
              {entry.email}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailFieldLabel}>מספר WhatsApp</span>
            <span className={styles.detailFieldValue} dir="ltr">
              {entry.whatsapp || "לא צוין"}
            </span>
          </div>
          <div className={styles.detailField}>
            <span className={styles.detailFieldLabel}>תאריך ושעה</span>
            <span className={styles.detailFieldValue}>{formatDate(entry.created_at)}</span>
          </div>
        </div>

        <div className={styles.detailField}>
          <span className={styles.detailFieldLabel}>תוכן ההודעה</span>
          <p className={styles.messageBody}>{entry.message}</p>
        </div>

        <ContactMessageDetailActions entry={entry} />

        {auditLog.length > 0 && (
          <div className={styles.detailField}>
            <span className={styles.detailFieldLabel}>יומן פעולות</span>
            <ul>
              {auditLog.map((log) => (
                <li key={log.id} className={styles.detailFieldValue}>
                  {AUDIT_ACTION_LABEL[log.action] ?? log.action} — {formatDate(log.created_at)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
