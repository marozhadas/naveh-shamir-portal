"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { OFFER_CODES, SUBSCRIPTION_OFFERS, getOffer, type OfferCode } from "@/data/subscription-offers";
import { changeBusinessOfferAction } from "./actions";
import styles from "./detail.module.css";

type FrozenTrial = {
  offerCode: OfferCode | null;
  trialDays: number | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
};

type BusinessOfferControlProps = {
  businessId: string;
  currentOfferCode: OfferCode;
  /** The subscription's own snapshot, once a trial was activated (then the offer is frozen). Null before that. */
  frozenTrial: FrozenTrial | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function BusinessOfferControl({ businessId, currentOfferCode, frozenTrial }: BusinessOfferControlProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pendingOffer, setPendingOffer] = useState<OfferCode>(currentOfferCode);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = getOffer(currentOfferCode);

  function openConfirm(next: OfferCode) {
    if (next === currentOfferCode) return;
    setPendingOffer(next);
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await changeBusinessOfferAction({ businessId, offerCode: pendingOffer });
      if (result.status === "success") {
        dialogRef.current?.close();
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  // After activation the subscription's own snapshot is the truth (legacy rows have none: always a standard 30-day trial).
  const frozenOffer = frozenTrial ? getOffer(frozenTrial.offerCode) : null;
  const frozenDays = frozenTrial ? (frozenTrial.trialDays ?? frozenOffer?.trialDays ?? null) : null;

  return (
    <section className={styles.section} aria-labelledby="offer-control-heading">
      <h2 id="offer-control-heading" className={styles.sectionTitle}>
        קבוצת הטבה
      </h2>

      <dl className={styles.detailsGrid}>
        <div>
          <dt>קבוצת הטבה</dt>
          <dd>{frozenTrial ? (frozenOffer?.groupLabel ?? current.groupLabel) : current.groupLabel}</dd>
        </div>
        <div>
          <dt>תקופת ניסיון</dt>
          <dd>{frozenTrial ? (frozenOffer?.code === "pilot_2026" ? `${frozenDays} ימי ניסיון — הטבת פיילוט` : `${frozenDays} ימי ניסיון`) : current.trialLabel}</dd>
        </div>
        {frozenTrial && (
          <>
            <div>
              <dt>הניסיון התחיל</dt>
              <dd>{formatDate(frozenTrial.trialStartedAt)}</dd>
            </div>
            <div>
              <dt>הניסיון מסתיים</dt>
              <dd>{formatDate(frozenTrial.trialEndsAt)}</dd>
            </div>
          </>
        )}
      </dl>

      {frozenTrial ? (
        <p className={styles.hint}>תקופת הניסיון כבר הופעלה — ההטבה שנקבעה בעת ההפעלה נשמרה במנוי ואינה משתנה. שינוי הטבה קיימת דורש תהליך נפרד, עם אישור ותיעוד.</p>
      ) : (
        <>
          <div className={styles.planButtons} role="group" aria-label="קבוצת הטבה: רגיל / פיילוט">
            {OFFER_CODES.map((code) => (
              <Button
                key={code}
                type="button"
                variant={code === currentOfferCode ? "primary" : "secondary"}
                size="compact"
                disabled={code === currentOfferCode}
                onClick={() => openConfirm(code)}
              >
                {code === currentOfferCode ? `נבחר: ${SUBSCRIPTION_OFFERS[code].groupLabel}` : `שינוי ל${SUBSCRIPTION_OFFERS[code].groupLabel}`}
              </Button>
            ))}
          </div>
          <p className={styles.hint}>אפשר לשנות רגיל ↔ פיילוט עד להפעלת תקופת הניסיון. המחירים זהים — ההבדל הוא רק באורך הניסיון.</p>
        </>
      )}

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="offer-dialog-title">
        <div className={styles.dialogBody}>
          <h2 id="offer-dialog-title" className={styles.dialogTitle}>
            שינוי קבוצת הטבה
          </h2>
          <p className={styles.dialogText}>
            העסק יעבור מקבוצת {current.groupLabel} ({current.trialLabel}) לקבוצת {SUBSCRIPTION_OFFERS[pendingOffer].groupLabel} ({SUBSCRIPTION_OFFERS[pendingOffer].trialLabel}).
            <br />
            ההטבה תיקבע סופית ברגע שבעל/ת העסק יפעיל/תפעיל את תקופת הניסיון. הפעולה נרשמת ביומן הפעולות.
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
              {isPending ? "מעדכן…" : "אישור שינוי ההטבה"}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
