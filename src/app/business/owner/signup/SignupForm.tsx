"use client";

import { useActionState, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signupWithPasswordAction, type SignupState } from "./actions";
import styles from "../login/login.module.css";

const INITIAL_STATE: SignupState = { status: "idle" };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupWithPasswordAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const fullNameId = useId();
  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  if (state.status === "check-email") {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>נותר עוד שלב אחד</p>
        <p className={styles.successDetail}>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={fullNameId}>שם מלא</label>
        <input id={fullNameId} name="fullName" type="text" required autoFocus autoComplete="name" />
      </div>

      <div className={styles.field}>
        <label htmlFor={usernameId}>שם משתמש</label>
        <input id={usernameId} name="username" type="text" dir="ltr" required autoComplete="username" placeholder="hadas-design" />
      </div>

      <div className={styles.field}>
        <label htmlFor={emailId}>אימייל</label>
        <input id={emailId} name="email" type="email" dir="ltr" required autoComplete="email" />
      </div>

      <div className={styles.field}>
        <label htmlFor={passwordId}>סיסמה</label>
        <div className={styles.passwordFieldWrap}>
          <input id={passwordId} name="password" type={showPassword ? "text" : "password"} dir="ltr" required minLength={8} autoComplete="new-password" />
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
        {isPending ? "יוצר/ת חשבון…" : "יצירת חשבון"}
      </Button>
    </form>
  );
}
