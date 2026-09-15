"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";
import styles from "../login/login.module.css";

const INITIAL_STATE: ForgotPasswordState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, INITIAL_STATE);
  const emailId = useId();

  if (state.status === "sent") {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>נשלח מייל</p>
        <p className={styles.successDetail}>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={emailId}>כתובת אימייל</label>
        <input id={emailId} name="email" type="email" dir="ltr" required autoFocus autoComplete="email" />
      </div>

      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="accent" disabled={isPending} fullWidth>
        {isPending ? "שולח…" : "שליחת הוראות איפוס"}
      </Button>
    </form>
  );
}
