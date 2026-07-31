import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { ViewerSwitcher } from "@/components/demo/ViewerSwitcher/ViewerSwitcher";
import { Button } from "@/components/ui/Button";
import { authAdapter } from "@/adapters/mock-auth-adapter";
import styles from "./register.module.css";

export const metadata: Metadata = { title: "רישום עסק | נווה שמיר", robots: { index: false, follow: false } };

/**
 * There is no real signup/authentication in this phase (spec section 60 excludes it). This page
 * says so plainly instead of pretending — real registration will replace the demo viewer switch
 * once an Auth Adapter backed by a real provider exists.
 */
export default async function BusinessRegisterPage() {
  const viewer = await authAdapter.getCurrentUser();

  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <ViewerSwitcher currentViewerId={viewer?.id ?? null} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>רישום כבעל/ת עסק</h1>
          <p className={styles.description}>
            הרשמה אמיתית עדיין לא זמינה בשלב הזה של הפורטל — אין עדיין מערכת התחברות אמיתית. כדי להתנסות בדשבורד
            ובתהליך תקופת הניסיון, אפשר לבחור זהות הדגמה בסרגל הצהוב שמופיע מעל, ולאחר מכן להמשיך ל
            <span className={styles.inlineLink}> פתיחת עמוד עסק</span>.
          </p>
          <Button href="/business/trial" variant="accent">
            להמשך אל פתיחת עמוד עסק
          </Button>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
