import type { Metadata } from "next";
import Image from "next/image";
import { Package, ExternalLink } from "lucide-react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { getManagedListingByToken, touchManagementTokenLastUsed } from "@/repositories/marketplace-management-service";
import { MARKETPLACE_STATUS_LABEL } from "@/types/marketplace";
import { formatListingDate } from "@/utils/format-listing-date";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/utils/get-client-ip";
import { ManageListingActions } from "./ManageListingActions";
import styles from "./manage.module.css";

type ManagePageProps = { params: Promise<{ token: string }> };

// Never indexed, never in a sitemap (this project has none) — a management link is a secret, not a public page.
export const metadata: Metadata = { title: "ניהול המודעה | נווה שמיר", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const VIEW_RATE_LIMIT_MAX = 30;
const VIEW_RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes

function InvalidLinkCard() {
  return (
    <div className={styles.container}>
      <div className={styles.invalidBox} role="status">
        <h1 className={styles.invalidTitle}>הקישור אינו תקין או שפג תוקפו</h1>
        <p className={styles.invalidDetail}>אם פרסמתם את המודעה, נסו להשתמש בקישור המקורי שקיבלתם לאחר הפרסום.</p>
      </div>
    </div>
  );
}

export default async function ManageListingPage({ params }: ManagePageProps) {
  const { token } = await params;

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`marketplace-manage-view:${ip}`, VIEW_RATE_LIMIT_MAX, VIEW_RATE_LIMIT_WINDOW_SECONDS);

  // A rate-limited visitor sees the exact same "invalid link" screen as a wrong token — the point
  // of rate limiting a token-guessing attack is that it must look identical to just failing.
  const listing = allowed ? await getManagedListingByToken(token) : null;

  if (!listing) {
    return (
      <>
        <a href="#main-content" className="skip-link">
          דלגו לתוכן הראשי
        </a>
        <ConnectedHeader />
        <main id="main-content">
          <InvalidLinkCard />
        </main>
        <Footer settings={defaultFooterSettings} />
      </>
    );
  }

  await touchManagementTokenLastUsed(listing.id);

  const coverImage = listing.images[0];
  const priceLabel = listing.is_free ? "למסירה — חינם" : listing.price !== null ? `${listing.price} ₪` : null;
  const canPreview = listing.status !== "pending" && listing.status !== "removed";

  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>ניהול המודעה</h1>
            <p className={styles.subtitle}>כאן אפשר לעדכן את מצב המודעה בלי להתחבר לאתר.</p>
          </div>

          <div className={styles.card}>
            {coverImage ? (
              <div className={styles.imageWrap}>
                <Image src={coverImage.src} alt={coverImage.alt} fill sizes="(max-width: 640px) 100vw, 480px" className={styles.image} />
              </div>
            ) : (
              <div className={styles.imagePlaceholder} aria-hidden="true">
                <Package size={40} strokeWidth={1.5} />
              </div>
            )}

            <h2 className={styles.listingTitle}>{listing.title}</h2>
            {priceLabel && <p className={styles.price}>{priceLabel}</p>}

            <div className={styles.metaRow}>
              <span className={styles.statusBadge}>{MARKETPLACE_STATUS_LABEL[listing.status]}</span>
              <span className={styles.publishedAt}>פורסם בתאריך {formatListingDate(listing.created_at)}</span>
            </div>

            {canPreview && (
              <div className={styles.previewLinkWrap}>
                <Button href={`/marketplace/${listing.slug}`} variant="secondary" size="compact" icon={<ExternalLink size={14} aria-hidden="true" />} target="_blank" rel="noopener noreferrer">
                  צפייה בעמוד המודעה
                </Button>
              </div>
            )}

            <ManageListingActions token={token} listing={listing} />
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
