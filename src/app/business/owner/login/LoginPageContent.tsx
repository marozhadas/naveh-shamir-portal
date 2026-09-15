"use client";

import { useState } from "react";
import Link from "next/link";
import { PasswordLoginForm } from "./PasswordLoginForm";
import { OwnerLoginForm } from "./OwnerLoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import styles from "./login.module.css";

/**
 * Password + email/username is the primary method (spec), with a plain link to switch to the
 * older magic-link flow — kept available as a fallback rather than removed, per spec section 32.
 */
export function LoginPageContent() {
  const [method, setMethod] = useState<"password" | "magic-link">("password");

  if (method === "magic-link") {
    return (
      <>
        <OwnerLoginForm />
        <p className={styles.switchMethodRow}>
          <button type="button" className={styles.link} onClick={() => setMethod("password")}>
            חזרה להתחברות עם סיסמה
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <PasswordLoginForm />

      <div className={styles.divider}>או</div>

      <GoogleSignInButton />

      <p className={styles.switchMethodRow}>
        <button type="button" className={styles.link} onClick={() => setMethod("magic-link")}>
          או קבלו קישור התחברות למייל
        </button>
      </p>

      <p className={styles.footerRow}>
        אין לכם חשבון?{" "}
        <Link href="/business/owner/signup" className={styles.link}>
          הרשמה
        </Link>
      </p>
    </>
  );
}
