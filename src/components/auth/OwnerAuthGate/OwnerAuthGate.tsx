import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordLoginForm } from "@/app/business/owner/login/PasswordLoginForm";
import loginStyles from "@/app/business/owner/login/login.module.css";
import styles from "./OwnerAuthGate.module.css";

type OwnerAuthGateProps = {
  planName: string;
  billingIntervalLabel: string;
  /** Same-site path that brings the visitor back here (plan + billing interval included) once signed in. */
  returnTo: string;
};

/**
 * Shown INSTEAD of the Plus/Premium registration wizard while nobody is signed in — the wizard
 * itself is never mounted, so no half-filled form can be lost to the OAuth redirect. Every method
 * here round-trips `returnTo` through the existing /auth/callback?next= / hidden-`next` support.
 */
export function OwnerAuthGate({ planName, billingIntervalLabel, returnTo }: OwnerAuthGateProps) {
  const encoded = encodeURIComponent(returnTo);

  return (
    <section className={styles.gate} aria-labelledby="owner-auth-gate-title">
      <h2 id="owner-auth-gate-title" className={styles.title}>
        כדי להמשיך להרשמה, יש להתחבר או ליצור חשבון
      </h2>
      <p className={styles.description}>
        החשבון יאפשר לכם לנהל את העסק באזור האישי. אחרי ההתחברות תחזרו אוטומטית להרשמה לחבילת {planName} ({billingIntervalLabel}).
      </p>

      <GoogleSignInButton next={returnTo} />

      <div className={loginStyles.divider}>או</div>

      <PasswordLoginForm next={returnTo} />

      <p className={loginStyles.footerRow}>
        אין לכם חשבון?{" "}
        <Link href={`/business/owner/signup?next=${encoded}`} className={loginStyles.link}>
          הרשמה
        </Link>
      </p>
    </section>
  );
}
