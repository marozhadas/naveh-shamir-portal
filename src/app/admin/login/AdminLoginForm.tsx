"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/Button";
import { adminLoginAction, type AdminLoginActionState } from "./actions";
import styles from "./login.module.css";

const INITIAL_STATE: AdminLoginActionState = { error: null };

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(adminLoginAction, INITIAL_STATE);
  const passwordId = useId();

  return (
    <form action={formAction} className={styles.loginForm}>
      <h1 className={styles.loginTitle}>כניסת מנהל</h1>
      <div className={styles.field}>
        <label htmlFor={passwordId}>סיסמה</label>
        <input id={passwordId} name="password" type="password" required autoFocus dir="ltr" />
      </div>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="accent" disabled={isPending} fullWidth>
        {isPending ? "בודק…" : "כניסה"}
      </Button>
    </form>
  );
}
