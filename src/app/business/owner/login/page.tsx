import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { OwnerLoginForm } from "./OwnerLoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "כניסת בעלי עסקים | נווה שמיר", robots: { index: false, follow: false } };

export default function OwnerLoginPage() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>כניסת בעלי עסקים</h1>
          <p className={styles.description}>
            מלאו את כתובת המייל שאיתה נרשם העסק שלכם, ונשלח קישור התחברות מאובטח — ללא צורך בסיסמה.
          </p>
          <OwnerLoginForm />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
