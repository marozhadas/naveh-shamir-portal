"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { requestOwnerMagicLinkAction, type RequestMagicLinkState } from "./actions";
import styles from "./login.module.css";

const INITIAL_STATE: RequestMagicLinkState = { status: "idle" };

export function OwnerLoginForm() {
  const [state, formAction, isPending] = useActionState(requestOwnerMagicLinkAction, INITIAL_STATE);
  const emailId = useId();

  if (state.status === "sent") {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>שלחנו קישור התחברות למייל</p>
        <p className={styles.successDetail}>לחצו על הקישור שקיבלתם כדי להתחבר ולהמשיך להפעלת החודש החינם.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={emailId}>כתובת המייל שאיתה נרשם העסק</label>
        <input id={emailId} name="email" type="email" dir="ltr" required autoFocus />
      </div>

      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="accent" disabled={isPending} fullWidth>
        {isPending ? "שולח קישור…" : "שליחת קישור התחברות"}
      </Button>
    </form>
  );
}
