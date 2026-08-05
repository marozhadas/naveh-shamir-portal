"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { changeBusinessPlanAction } from "./actions";
import type { BusinessPlanId } from "@/types/business-plan";
import styles from "./detail.module.css";

const PLAN_LABEL: Record<BusinessPlanId, string> = { basic: "Basic", plus: "Plus", premium: "Premium" };
const PLAN_OPTIONS: BusinessPlanId[] = ["basic", "plus", "premium"];

/** What changes for the business, shown inside the confirmation dialog — spec section 14: different copy per transition, an explicit warning when downgrading to Basic. */
function transitionCopy(from: BusinessPlanId, to: BusinessPlanId): string {
  if (to === "basic") {
    return "עמוד העסק המלא ירד מהאוויר והכרטיס יפסיק להיות לחיץ. כל התוכן יישמר ולא יימחק.";
  }
  if (to === "premium") {
    return "העסק יקבל תגית “עסק מאומת” וזכאות לאזור אישי ולעסק מוביל.";
  }
  // to === "plus"
  if (from === "basic") {
    return "לאחר השינוי הכרטיס יהפוך ללחיץ ועמוד העסק המלא יעלה לאוויר.";
  }
  return "העסק יעבור לחבילת Plus — ללא תגית “עסק מאומת” וללא עריכה עצמאית.";
}

type BusinessPlanControlProps = {
  businessId: string;
  currentActivePlanId: BusinessPlanId;
  selectedPlanId: BusinessPlanId;
};

export function BusinessPlanControl({ businessId, currentActivePlanId, selectedPlanId }: BusinessPlanControlProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pendingPlanId, setPendingPlanId] = useState<BusinessPlanId>(currentActivePlanId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openConfirm(nextPlanId: BusinessPlanId) {
    if (nextPlanId === currentActivePlanId) return;
    setPendingPlanId(nextPlanId);
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await changeBusinessPlanAction({ businessId, newPlanId: pendingPlanId });
      if (result.status === "success") {
        dialogRef.current?.close();
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  return (
    <section className={styles.section} aria-labelledby="plan-control-heading">
      <h2 id="plan-control-heading" className={styles.sectionTitle}>
        סוג החבילה
      </h2>
      <dl className={styles.detailsGrid}>
        <div>
          <dt>חבילה שנבחרה בטופס</dt>
          <dd>{PLAN_LABEL[selectedPlanId]}</dd>
        </div>
        <div>
          <dt>חבילה פעילה</dt>
          <dd>{PLAN_LABEL[currentActivePlanId]}</dd>
        </div>
      </dl>

      <div className={styles.planButtons}>
        {PLAN_OPTIONS.map((planId) => (
          <Button
            key={planId}
            type="button"
            variant={planId === currentActivePlanId ? "primary" : "secondary"}
            size="compact"
            disabled={planId === currentActivePlanId}
            onClick={() => openConfirm(planId)}
          >
            {planId === currentActivePlanId ? `פעיל: ${PLAN_LABEL[planId]}` : `שינוי ל-${PLAN_LABEL[planId]}`}
          </Button>
        ))}
      </div>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="plan-dialog-title">
        <div className={styles.dialogBody}>
          <h2 id="plan-dialog-title" className={styles.dialogTitle}>
            שינוי חבילת העסק
          </h2>
          <p className={styles.dialogText}>
            העסק יעבור מחבילת {PLAN_LABEL[currentActivePlanId]} לחבילת {PLAN_LABEL[pendingPlanId]}.
            <br />
            {transitionCopy(currentActivePlanId, pendingPlanId)}
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
              {isPending ? "משנה…" : "אישור שינוי החבילה"}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
