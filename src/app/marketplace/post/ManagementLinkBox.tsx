"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
import styles from "./post.module.css";

type ManagementLinkBoxProps = {
  managementUrl: string;
};

/**
 * Shown exactly once, right after a listing is submitted — this is the poster's only chance to
 * save their management link (see MarketplaceListingActionState.managementUrl's doc comment: the
 * raw token is never persisted anywhere, so there is no "resend my link" recovery path other than
 * asking the admin to rotate it).
 */
export function ManagementLinkBox({ managementUrl }: ManagementLinkBoxProps) {
  const [copied, setCopied] = useState(false);
  const whatsappSelfShareUrl = createWhatsappLink(
    "https://wa.me/",
    `זהו קישור הניהול למודעה שפרסמתי בפורטל נווה שמיר:\n${managementUrl}`,
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(managementUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context) — the link is still
      // shown selectable in the input below, so the user can copy it manually either way.
    }
  }

  return (
    <div className={styles.managementLinkBox}>
      <p className={styles.managementLinkTitle}>שמרו את הקישור הבא. דרכו תוכלו לעדכן שהפריט נמכר או נמסר, בלי להירשם לאתר.</p>
      <div className={styles.managementLinkRow}>
        <input type="text" readOnly dir="ltr" value={managementUrl} className={styles.managementLinkInput} onFocus={(e) => e.target.select()} />
        <Button type="button" variant="secondary" size="compact" icon={copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} onClick={handleCopy}>
          {copied ? "הועתק!" : "העתקת קישור"}
        </Button>
      </div>
      {whatsappSelfShareUrl && (
        <Button href={whatsappSelfShareUrl} variant="whatsapp" target="_blank" rel="noopener noreferrer" icon={<WhatsAppIcon size={16} aria-hidden="true" />}>
          שלחו לעצמכם את הקישור ב-WhatsApp
        </Button>
      )}
    </div>
  );
}
