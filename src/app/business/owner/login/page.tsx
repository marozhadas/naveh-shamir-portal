import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { safeReturnPath } from "@/utils/safe-return-path";
import { LoginPageContent } from "./LoginPageContent";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "כניסת בעלי עסקים | נווה שמיר", robots: { index: false, follow: false } };

type OwnerLoginPageProps = { searchParams: Promise<{ next?: string }> };

export default async function OwnerLoginPage({ searchParams }: OwnerLoginPageProps) {
  const { next } = await searchParams;
  const returnTo = safeReturnPath(next) ?? undefined;
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>ברוכים השבים</h1>
          <p className={styles.description}>התחברו לחשבון בעל/ת העסק שלכם.</p>
          <LoginPageContent next={returnTo} />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
