"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSumitCardSavedStatusAction } from "@/app/business/dashboard/sumit-payment-actions";
import { CARD_ALREADY_SAVED, CARD_ALREADY_SAVED_CONTINUE, CARD_STATUS_CHECKING, CARD_STATUS_ERROR, CARD_STATUS_RETRY } from "@/lib/sumit/registration-copy";
import { SumitCardForm } from "./SumitCardForm";
import styles from "../PaymentMethodTrialForm/PaymentMethodTrialForm.module.css";

type SumitCardStepProps = {
  companyId: number;
  apiPublicKey: string;
  registrationId: string;
  onCompleted: () => void;
};

/**
 * Step 6 as the wizard and the resume page show it: first ask the server (read only) whether the card of THIS registration was
 * already saved - a reload, a restored session, or a save that finished on the server after the page was left - and only if not,
 * show the card form. When it is saved, the owner is told so and offered "continue"; nothing is saved again automatically and the
 * card form is not shown. The form appears ONLY on an explicit "not-saved" answer: if the check fails (an error answer or a failed
 * call) the owner gets a message and a "try again" button - never the form, because a form would invite a second save of a card that
 * may already be saved.
 */
export function SumitCardStep({ companyId, apiPublicKey, registrationId, onCompleted }: SumitCardStepProps) {
  const [status, setStatus] = useState<"checking" | "saved" | "ask" | "unknown">("checking");
  // bumped by "try again": every value is one more read-only check
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSumitCardSavedStatusAction({ registrationId }).then(
      (result) => {
        if (cancelled) return;
        setStatus(result.status === "saved" ? "saved" : result.status === "not-saved" ? "ask" : "unknown");
      },
      () => {
        if (!cancelled) setStatus("unknown");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [registrationId, attempt]);

  if (status === "checking") {
    return (
      <p className={styles.lead} role="status">
        {CARD_STATUS_CHECKING}
      </p>
    );
  }

  if (status === "unknown") {
    return (
      <div className={styles.form}>
        <p className={styles.error} role="alert">
          {CARD_STATUS_ERROR}
        </p>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() => {
            setStatus("checking");
            setAttempt((value) => value + 1);
          }}
        >
          {CARD_STATUS_RETRY}
        </Button>
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className={styles.form}>
        <p className={styles.lead} role="status">
          {CARD_ALREADY_SAVED}
        </p>
        <Button type="button" variant="accent" fullWidth onClick={onCompleted}>
          {CARD_ALREADY_SAVED_CONTINUE}
        </Button>
      </div>
    );
  }

  return <SumitCardForm companyId={companyId} apiPublicKey={apiPublicKey} registrationId={registrationId} onCompleted={onCompleted} />;
}
