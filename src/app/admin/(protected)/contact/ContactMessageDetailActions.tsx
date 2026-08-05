"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { normalizePhoneForWhatsAppLink } from "@/utils/normalize-phone-for-whatsapp-link";
import { deleteContactMessageAction, setContactMessageStatusAction } from "./actions";
import type { ContactMessageRow, ContactMessageStatus } from "@/types/contact-message";
import styles from "./contact-admin.module.css";

const EMAIL_SUBJECT = "פנייה מפורטל נווה שמיר";

type ContactMessageDetailActionsProps = {
  entry: ContactMessageRow;
};

/**
 * No call/dial button anywhere — WhatsApp opens wa.me with the number the visitor provided
 * (normalized to international form); email opens a mailto: pre-filled with a fixed, non-personal
 * subject line. Both are plain navigations, never a click-to-call `tel:` link.
 */
export function ContactMessageDetailActions({ entry }: ContactMessageDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(status: ContactMessageStatus) {
    startTransition(async () => {
      await setContactMessageStatusAction(entry.id, status);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`למחוק לצמיתות את הפנייה של "${entry.full_name}"? הפעולה אינה הפיכה.`)) return;
    startTransition(async () => {
      await deleteContactMessageAction(entry.id);
      router.push("/admin/contact");
    });
  }

  const whatsappUrl = entry.whatsapp ? `https://wa.me/${normalizePhoneForWhatsAppLink(entry.whatsapp)}` : null;
  const mailtoUrl = `mailto:${entry.email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`;

  return (
    <div className={styles.detailActions}>
      {whatsappUrl && (
        <Button href={whatsappUrl} variant="whatsapp" target="_blank" rel="noopener noreferrer" icon={<WhatsAppIcon size={16} aria-hidden="true" />}>
          פתיחת WhatsApp
        </Button>
      )}
      <Button href={mailtoUrl} variant="secondary" icon={<Mail size={16} aria-hidden="true" />}>
        שליחת מייל
      </Button>
      {entry.status !== "in-progress" && (
        <Button variant="secondary" disabled={isPending} onClick={() => changeStatus("in-progress")}>
          סימון כבטיפול
        </Button>
      )}
      {entry.status !== "closed" && (
        <Button variant="secondary" disabled={isPending} onClick={() => changeStatus("closed")}>
          סימון כנסגר
        </Button>
      )}
      {entry.status !== "spam" && (
        <Button variant="secondary" disabled={isPending} onClick={() => changeStatus("spam")}>
          סימון כספאם
        </Button>
      )}
      <Button variant="secondary" disabled={isPending} onClick={handleDelete}>
        מחיקה
      </Button>
    </div>
  );
}
