import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { LoginPageContent } from "./LoginPageContent";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "כניסת בעלי עסקים | נווה שמיר", robots: { index: false, follow: false } };

export default function OwnerLoginPage() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>ברוכים השבים</h1>
          <p className={styles.description}>התחברו לחשבון בעל/ת העסק שלכם.</p>
          <LoginPageContent />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
