"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { startTrialAction, type StartTrialActionState } from "./actions";
import styles from "./trial.module.css";

const INITIAL_STATE: StartTrialActionState = { error: null };

export function TrialStartForm() {
  const [state, formAction, isPending] = useActionState(startTrialAction, INITIAL_STATE);
  const consentId = useId();

  return (
    <form action={formAction} className={styles.form} noValidate>
      <label htmlFor={consentId} className={styles.consentRow}>
        <input id={consentId} name="consent" type="checkbox" required className={styles.checkbox} />
        <span>קראתי ואני מאשר/ת את תנאי השימוש ואת תנאי תקופת הניסיון.</span>
      </label>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="accent" disabled={isPending} fullWidth>
        {isPending ? "מפעילים..." : "הפעלת 30 ימי ניסיון"}
      </Button>
    </form>
  );
}
