import type { Metadata } from "next";
import Link from "next/link";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SignupForm } from "./SignupForm";
import styles from "../login/login.module.css";

export const metadata: Metadata = { title: "יצירת חשבון בעל/ת עסק | נווה שמיר", robots: { index: false, follow: false } };

export default function OwnerSignupPage() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>יצירת חשבון</h1>
          <p className={styles.description}>יוצרים חשבון בעל/ת עסק כדי לנהל את העמוד שלכם באתר.</p>
          <SignupForm />
          <div className={styles.divider}>או</div>
          <GoogleSignInButton />
          <p className={styles.footerRow}>
            יש לכם כבר חשבון?{" "}
            <Link href="/business/owner/login" className={styles.link}>
              התחברות
            </Link>
          </p>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
