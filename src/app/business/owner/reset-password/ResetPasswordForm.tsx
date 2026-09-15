"use client";

import { useActionState, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updatePasswordAction, type UpdatePasswordState } from "./actions";
import styles from "../login/login.module.css";

const INITIAL_STATE: UpdatePasswordState = { status: "idle" };

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const confirmPasswordId = useId();

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={passwordId}>סיסמה חדשה</label>
        <div className={styles.passwordFieldWrap}>
          <input id={passwordId} name="password" type={showPassword ? "text" : "password"} dir="ltr" required minLength={8} autoComplete="new-password" autoFocus />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={confirmPasswordId}>אימות סיסמה</label>
        <input id={confirmPasswordId} name="confirmPassword" type={showPassword ? "text" : "password"} dir="ltr" required minLength={8} autoComplete="new-password" />
      </div>

      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="accent" disabled={isPending} fullWidth>
        {isPending ? "מעדכן/ת…" : "עדכון סיסמה"}
      </Button>
    </form>
  );
}
