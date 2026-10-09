"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { changeBusinessBillingTestAction } from "./actions";
import styles from "./detail.module.css";

type BusinessBillingTestControlProps = {
  businessId: string;
  enabled: boolean;
  /** The server's PayMe environment ("לא מוגדר" while PayMe has no keys). Display only — the server decides on its own. */
  payMeEnv: "sandbox" | "live" | null;
  hasPayMeSubscription: boolean;
};

const ENV_LABEL = { sandbox: "Sandbox (בדיקות)", live: "Live (חיוב אמיתי)" } as const;

export function BusinessBillingTestControl({ businessId, enabled, payMeEnv, hasPayMeSubscription }: BusinessBillingTestControlProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = !enabled;

  function handleConfirm() {
    startTransition(async () => {
      const result = await changeBusinessBillingTestAction({ businessId, enabled: next });
      if (result.status === "success") {
        dialogRef.current?.close();
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  return (
    <section className={styles.section} aria-labelledby="billing-test-heading">
      <h2 id="billing-test-heading" className={styles.sectionTitle}>
        בדיקת סליקה (Sandbox)
      </h2>

      <dl className={styles.detailsGrid}>
        <div>
          <dt>סביבת PayMe בשרת</dt>
          <dd>{payMeEnv ? ENV_LABEL[payMeEnv] : "לא מוגדרת — הסליקה כבויה"}</dd>
        </div>
        <div>
          <dt>בדיקת סליקה לעסק זה</dt>
          <dd>{enabled ? "מופעלת" : "כבויה"}</dd>
        </div>
        {hasPayMeSubscription && (
          <div>
            <dt>מנוי PayMe</dt>
            <dd>קיים</dd>
          </div>
        )}
      </dl>

      <div className={styles.planButtons} role="group" aria-label="בדיקת סליקה לעסק">
        <Button
          type="button"
          variant={enabled ? "secondary" : "primary"}
          size="compact"
          onClick={() => {
            setError(null);
            dialogRef.current?.showModal();
          }}
        >
          {enabled ? "כיבוי בדיקת הסליקה" : "הפעלת בדיקת סליקה לעסק"}
        </Button>
      </div>
      <p className={styles.hint}>
        כל עוד סביבת PayMe היא Sandbox, רק עסק שהופעל כאן יראה את טופס הכרטיס ויוכל להתחיל זרימת סליקה — שאר העסקים ממשיכים להפעיל ניסיון כרגיל, בלי כרטיס. כשהסביבה תהיה Live המתג אינו משפיע ואינו חוסם סליקה. כל שינוי נרשם ביומן הפעולות.
      </p>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="billing-test-dialog-title">
        <div className={styles.dialogBody}>
          <h2 id="billing-test-dialog-title" className={styles.dialogTitle}>
            {next ? "הפעלת בדיקת סליקה" : "כיבוי בדיקת סליקה"}
          </h2>
          <p className={styles.dialogText}>
            {next
              ? "בעל/ת העסק יוכל/תוכל להזין כרטיס בסביבת הבדיקה של PayMe ולהפעיל ניסיון מול ה-Sandbox. הפעילו רק לחשבון בדיקה או לעסק שסוכם איתו מראש."
              : "העסק יחזור להפעלת ניסיון רגילה בלי כרטיס, כל עוד סביבת PayMe היא Sandbox. מנוי PayMe קיים של העסק לא יבוטל."}
            <br />
            הפעולה נרשמת ביומן הפעולות.
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.dialogActions}>
            <Button type="button" variant="secondary" size="compact" onClick={() => dialogRef.current?.close()} disabled={isPending}>
              ביטול
            </Button>
            <Button type="button" variant="accent" size="compact" onClick={handleConfirm} disabled={isPending}>
              {isPending ? "מעדכן…" : "אישור"}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
