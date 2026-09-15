import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import styles from "../login/login.module.css";

export const metadata: Metadata = { title: "שכחתי סיסמה | נווה שמיר", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>שכחתי סיסמה</h1>
          <p className={styles.description}>מזינים את כתובת האימייל של החשבון, ונשלח הוראות לאיפוס הסיסמה.</p>
          <ForgotPasswordForm />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
