import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { getSupabaseSessionUser } from "@/lib/supabase/server-client";
import { getPaymentResume, PAYMENT_METHOD_ROUTE } from "@/lib/business-owner/payment-resume";
import { getSumitRegistrationPayment } from "@/lib/sumit/registration-access";
import { RESUME_NOTICE } from "@/lib/sumit/registration-copy";
import { ResumePaymentStep } from "./ResumePaymentStep";
import styles from "../trial/trial.module.css";

export const metadata: Metadata = { title: "השלמת אמצעי תשלום | נווה שמיר", robots: { index: false, follow: false } };

/**
 * Step 6 of the registration, for a signed-in owner whose registration is pending, paid and has no saved payment method yet
 * (they left before finishing). The registration is found on the server from the session - there is no id in the URL to
 * tamper with - and nothing new is created: the form saves the card on that same registration. Everything else (price,
 * trial, approval) is untouched; the business stays pending.
 */
export default async function PaymentMethodPage() {
  const sessionUser = await getSupabaseSessionUser();
  if (!sessionUser) redirect(`/business/owner/login?next=${encodeURIComponent(PAYMENT_METHOD_ROUTE)}`);

  const resume = await getPaymentResume();
  if (!resume) {
    // Nothing to complete (already saved, approved, free, or not this account's): back to the dashboard. In the sandbox an
    // account that is not on the test list is told it is unavailable instead of being shown a test form.
    if (!getSumitRegistrationPayment(sessionUser.email)) {
      return (
        <>
          <a href="#main-content" className="skip-link">
            דלגו לתוכן הראשי
          </a>
          <ConnectedHeader />
          <main id="main-content">
            <div className={styles.container}>
              <h1 className={styles.title}>השלמת אמצעי תשלום</h1>
              <p className={styles.notice} role="status">
                הוספת אמצעי תשלום אינה זמינה כרגע.
              </p>
              <div className={styles.actionBox}>
                <Button href="/business/dashboard" variant="secondary">
                  לאזור האישי
                </Button>
              </div>
            </div>
          </main>
          <Footer settings={defaultFooterSettings} />
        </>
      );
    }
    redirect("/business/dashboard");
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>השלמת אמצעי תשלום</h1>
          <p className={styles.subtitle}>
            {RESUME_NOTICE} העסק &quot;{resume.businessName}&quot; ימשיך להמתין לאישור הצוות.
          </p>
          <div className={styles.actionBox}>
            <ResumePaymentStep
              registrationId={resume.registrationId}
              companyId={resume.payment.companyId}
              apiPublicKey={resume.payment.apiPublicKey}
              planTier={resume.planTier}
            />
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
