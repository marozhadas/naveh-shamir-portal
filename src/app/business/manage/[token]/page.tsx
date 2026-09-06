import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { getManagedBusinessByToken, touchBusinessManagementTokenLastUsed } from "@/repositories/business-management-service";
import { checkBusinessManagementEligibility, BUSINESS_MANAGEMENT_INELIGIBILITY_MESSAGE } from "@/utils/business-management-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";
import { mapRegistrationToManagementValues } from "./map-registration-to-management-values";
import { ManagementEditForm } from "./ManagementEditForm";
import styles from "./manage.module.css";

type ManagePageProps = { params: Promise<{ token: string }> };

// Never indexed, never in a sitemap (this project has none) — a management link is a secret, not a public page.
export const metadata: Metadata = { title: "עריכת עמוד העסק | נווה שמיר", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const VIEW_RATE_LIMIT_MAX = 30;
const VIEW_RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes

// Deliberately the exact same generic message for "wrong token" and "rate-limited" — the point of
// rate limiting a token-guessing attack is that it must look identical to just failing.
function InvalidLinkCard() {
  return (
    <div className={styles.container}>
      <div className={styles.invalidBox} role="status">
        <h1 className={styles.invalidTitle}>הקישור אינו תקין או שפג תוקפו</h1>
        <p className={styles.invalidDetail}>אם קיבלתם קישור לעריכת עמוד העסק, נסו להשתמש בקישור המקורי שקיבלתם מהצוות שלנו.</p>
      </div>
    </div>
  );
}

/** Shown when the token itself resolves to a real business, but that business isn't (or isn't anymore) eligible for self-edit — an honest, specific message, since this is the owner's own resource and not an external prober who could learn something from it. */
function IneligibleCard({ reason }: { reason: string }) {
  return (
    <div className={styles.container}>
      <div className={styles.invalidBox} role="status">
        <h1 className={styles.invalidTitle}>הגישה לעריכה אינה זמינה כרגע</h1>
        <p className={styles.invalidDetail}>{reason}</p>
      </div>
    </div>
  );
}

function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">{children}</main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}

export default async function BusinessManagePage({ params }: ManagePageProps) {
  const { token } = await params;

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`business-manage-view:${ip}`, VIEW_RATE_LIMIT_MAX, VIEW_RATE_LIMIT_WINDOW_SECONDS);
  const registration = allowed ? await getManagedBusinessByToken(token) : null;

  if (!registration) {
    return (
      <PageChrome>
        <InvalidLinkCard />
      </PageChrome>
    );
  }

  const eligibility = checkBusinessManagementEligibility(registration);
  if (!eligibility.eligible) {
    return (
      <PageChrome>
        <IneligibleCard reason={BUSINESS_MANAGEMENT_INELIGIBILITY_MESSAGE[eligibility.reason]} />
      </PageChrome>
    );
  }

  await touchBusinessManagementTokenLastUsed(registration.id);

  return (
    <PageChrome>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>עריכת עמוד העסק</h1>
          <p className={styles.subtitle}>כאן אפשר לעדכן את פרטי העסק, התמונות, השעות והשירותים בלי להתחבר לאתר — {registration.business_name}.</p>
        </div>
        <ManagementEditForm token={token} initialValues={mapRegistrationToManagementValues(registration)} businessSlug={registration.slug} />
      </div>
    </PageChrome>
  );
}
