"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { rotateBusinessManagementLinkAction } from "./actions";
import styles from "./detail.module.css";

type BusinessManagementLinkControlProps = {
  businessId: string;
  hasExistingToken: boolean;
  /** Null when the business is currently eligible; otherwise the reason its owner can't use a link right now — shown so the admin knows why the button might still be worth clicking pre-emptively, or not yet. */
  ineligibilityReason: string | null;
};

/**
 * Lets an admin issue (or replace) a business's secret self-edit link — the only way one is ever
 * created; unlike Marketplace, there is no automatic issuance at registration or approval time
 * (spec: dashboard access is a deliberate, admin-granted step for Premium businesses only).
 */
export function BusinessManagementLinkControl({ businessId, hasExistingToken, ineligibilityReason }: BusinessManagementLinkControlProps) {
  const [isPending, startTransition] = useTransition();
  const [managementUrl, setManagementUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    const confirmed = hasExistingToken
      ? window.confirm("ליצור קישור ניהול חדש? הקישור הקודם שנשלח לבעל/ת העסק יפסיק לעבוד מיד.")
      : window.confirm("ליצור קישור עריכה עצמית לעסק זה?");
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await rotateBusinessManagementLinkAction(businessId);
      if (result.status !== "success") {
        setError(result.message);
        return;
      }
      setManagementUrl(result.managementUrl);
      setCopied(false);
    });
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(managementUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — the link is still selectable in the box itself.
    }
  }

  return (
    <section className={styles.section} aria-labelledby="management-link-heading">
      <h2 id="management-link-heading" className={styles.sectionTitle}>
        קישור עריכה עצמית לבעל/ת העסק
      </h2>
      <p className={styles.meta}>
        קישור סודי שמאפשר לבעל/ת העסק לערוך את עמוד העסק (פרטים, תמונות, שעות, שירותים) בלי להתחבר לאתר. יש להעביר אותו ישירות לבעל/ת העסק — אין דרך
        לשחזר קישור קודם שאבד, רק ליצור חדש.
      </p>

      {ineligibilityReason && <p className={styles.emailError}>{ineligibilityReason}</p>}
      {hasExistingToken && !managementUrl && <p className={styles.meta}>קישור פעיל כבר קיים לעסק זה. יצירת קישור חדש תבטל אותו.</p>}

      <div className={styles.planButtons}>
        <Button type="button" variant="secondary" size="compact" disabled={isPending} onClick={generate}>
          {isPending ? "יוצר קישור…" : hasExistingToken ? "יצירת קישור חדש" : "יצירת קישור עריכה"}
        </Button>
      </div>

      {error && (
        <p className={styles.emailError} role="alert">
          {error}
        </p>
      )}

      {managementUrl && (
        <div className={styles.successBox} role="status">
          <p className={styles.successTitle}>הקישור נוצר. יש להעביר אותו לבעל/ת העסק — הוא לא יוצג שוב:</p>
          <div className={styles.tokenRow}>
            <input type="text" readOnly dir="ltr" value={managementUrl} onFocus={(event) => event.target.select()} />
            <Button type="button" variant="secondary" size="compact" icon={copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} onClick={copyUrl}>
              {copied ? "הועתק!" : "העתקה"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
