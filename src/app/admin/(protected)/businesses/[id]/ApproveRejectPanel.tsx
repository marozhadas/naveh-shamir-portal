"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { approveRegistrationAction, rejectRegistrationAction, type RejectActionState } from "./actions";
import styles from "./detail.module.css";

const INITIAL_REJECT_STATE: RejectActionState = { error: null, success: false };

type ApproveRejectPanelProps = {
  registrationId: string;
  businessName: string;
};

export function ApproveRejectPanel({ registrationId, businessName }: ApproveRejectPanelProps) {
  const approveDialogRef = useRef<HTMLDialogElement>(null);
  const rejectDialogRef = useRef<HTMLDialogElement>(null);
  const [isApproving, startApproveTransition] = useTransition();
  const [rejectState, rejectFormAction, isRejecting] = useActionState(
    rejectRegistrationAction.bind(null, registrationId),
    INITIAL_REJECT_STATE,
  );

  useEffect(() => {
    if (rejectState.success) rejectDialogRef.current?.close();
  }, [rejectState.success]);

  function handleApprove() {
    startApproveTransition(async () => {
      await approveRegistrationAction(registrationId);
      approveDialogRef.current?.close();
    });
  }

  return (
    <>
      <div className={styles.actions}>
        <Button variant="accent" icon={<Check size={16} aria-hidden="true" />} onClick={() => approveDialogRef.current?.showModal()}>
          אישור
        </Button>
        <Button variant="secondary" icon={<X size={16} aria-hidden="true" />} onClick={() => rejectDialogRef.current?.showModal()}>
          דחייה
        </Button>
      </div>

      <dialog ref={approveDialogRef} className={styles.dialog} aria-labelledby="approve-dialog-title">
        <div className={styles.dialogBody}>
          <h2 id="approve-dialog-title" className={styles.dialogTitle}>
            אישור ופרסום העסק
          </h2>
          <p className={styles.dialogText}>
            העסק &quot;{businessName}&quot; יפורסם מיידית בארכיון העסקים הציבורי באתר. ניתן יהיה לשנות סטטוס זה גם בהמשך.
          </p>
          <div className={styles.dialogActions}>
            <Button variant="secondary" size="compact" onClick={() => approveDialogRef.current?.close()} disabled={isApproving}>
              ביטול
            </Button>
            <Button variant="accent" size="compact" onClick={handleApprove} disabled={isApproving}>
              {isApproving ? "מאשר…" : "אישור ופרסום"}
            </Button>
          </div>
        </div>
      </dialog>

      <dialog ref={rejectDialogRef} className={styles.dialog} aria-labelledby="reject-dialog-title">
        <form
          action={(formData) => {
            rejectFormAction(formData);
          }}
          className={styles.dialogBody}
        >
          <h2 id="reject-dialog-title" className={styles.dialogTitle}>
            דחיית ההרשמה
          </h2>
          <label htmlFor="reject-reason" className={styles.dialogText}>
            סיבת הדחייה (תישמר ותוצג לצוות הפורטל)
          </label>
          <textarea id="reject-reason" name="reason" required minLength={3} className={styles.textarea} />
          {rejectState.error && (
            <p className={styles.error} role="alert">
              {rejectState.error}
            </p>
          )}
          <div className={styles.dialogActions}>
            <Button type="button" variant="secondary" size="compact" onClick={() => rejectDialogRef.current?.close()} disabled={isRejecting}>
              ביטול
            </Button>
            <Button type="submit" variant="secondary" size="compact" disabled={isRejecting}>
              {isRejecting ? "דוחה…" : "דחיית ההרשמה"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
