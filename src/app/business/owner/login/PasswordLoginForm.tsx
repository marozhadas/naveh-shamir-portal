"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { loginWithPasswordAction, type LoginWithPasswordState } from "./actions";
import styles from "./login.module.css";

const INITIAL_STATE: LoginWithPasswordState = { status: "idle" };

export function PasswordLoginForm() {
  const [state, formAction, isPending] = useActionState(loginWithPasswordAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const identifierId = useId();
  const passwordId = useId();

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={identifierId}>שם משתמש או אימייל</label>
        <input id={identifierId} name="identifier" type="text" dir="ltr" required autoFocus autoComplete="username" />
      </div>

      <div className={styles.field}>
        <label htmlFor={passwordId}>סיסמה</label>
        <div className={styles.passwordFieldWrap}>
          <input id={passwordId} name="password" type={showPassword ? "text" : "password"} dir="ltr" required autoComplete="current-password" />
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

      <div className={styles.linksRow}>
        <Link href="/business/owner/forgot-password" className={styles.link}>
          שכחתי סיסמה
        </Link>
      </div>

      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="accent" disabled={isPending} fullWidth>
        {isPending ? "מתחבר/ת…" : "התחברות"}
      </Button>
    </form>
  );
}
