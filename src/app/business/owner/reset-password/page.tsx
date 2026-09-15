import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { getSupabaseSessionUser } from "@/lib/supabase/server-client";
import { ResetPasswordForm } from "./ResetPasswordForm";
import styles from "../login/login.module.css";

export const metadata: Metadata = { title: "איפוס סיסמה | נווה שמיר", robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  const sessionUser = await getSupabaseSessionUser();

  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>איפוס סיסמה</h1>
          {sessionUser ? (
            <>
              <p className={styles.description}>בחרו סיסמה חדשה לחשבון שלכם.</p>
              <ResetPasswordForm />
            </>
          ) : (
            <p className={styles.description}>הקישור אינו תקין או שפג תוקפו. יש לבקש קישור איפוס חדש מעמוד ההתחברות.</p>
          )}
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
