"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSumitCardSavedStatusAction } from "@/app/business/dashboard/sumit-payment-actions";
import { CARD_ALREADY_SAVED, CARD_ALREADY_SAVED_CONTINUE, CARD_STATUS_CHECKING } from "@/lib/sumit/registration-copy";
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
 * card form is not shown. If the check itself fails, the form is shown (saving again just replaces the single row, never adds one).
 */
export function SumitCardStep({ companyId, apiPublicKey, registrationId, onCompleted }: SumitCardStepProps) {
  const [status, setStatus] = useState<"checking" | "saved" | "ask">("checking");

  useEffect(() => {
    let cancelled = false;
    getSumitCardSavedStatusAction({ registrationId }).then(
      (result) => {
        if (!cancelled) setStatus(result.status === "saved" ? "saved" : "ask");
      },
      () => {
        if (!cancelled) setStatus("ask");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  if (status === "checking") {
    return (
      <p className={styles.lead} role="status">
        {CARD_STATUS_CHECKING}
      </p>
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
