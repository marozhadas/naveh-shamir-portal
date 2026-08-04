import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Phone, Package } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { getActiveListingBySlug } from "@/repositories/marketplace-service";
import { getMarketplaceCategoryLabel } from "@/data/marketplace-categories";
import { MARKETPLACE_CONDITION_LABEL, MARKETPLACE_STATUS_LABEL } from "@/types/marketplace";
import { formatListingDate } from "@/utils/format-listing-date";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
import { ReportListingButton } from "./ReportListingButton";
import styles from "./listing.module.css";

type ListingPageProps = { params: Promise<{ slug: string }> };

/**
 * Next.js's dynamic route params are supposed to already be URL-decoded, but for a non-ASCII
 * (e.g. Hebrew) slug this build inconsistently hands the page component the still-percent-encoded
 * string — see the identical fix in businesses/[slug]/resolve-business-view.ts. Decoding here is
 * safe either way: an already-decoded slug (no "%" sequences) passes through unchanged.
 */
function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const listing = await getActiveListingBySlug(slug);
  if (!listing) return { title: "מודעה לא נמצאה | לוח מסירה ומכירה", robots: { index: false, follow: false } };

  return {
    title: `${listing.title} | לוח מסירה ומכירה בנווה שמיר`,
    description: listing.description.slice(0, 160),
    robots: { index: false, follow: false },
  };
}

function whatsappHref(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return createWhatsappLink(`https://wa.me/${digits}`);
}

export default async function MarketplaceListingPage({ params }: ListingPageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const listing = await getActiveListingBySlug(slug);
  if (!listing) notFound();

  const categoryLabel = getMarketplaceCategoryLabel(listing.category_id) ?? listing.category_id;
  const priceLabel = listing.is_free ? "למסירה — חינם" : listing.price !== null ? `${listing.price} ₪` : null;
  const whatsappUrl = listing.whatsapp_phone ? whatsappHref(listing.whatsapp_phone) : "";
  const isStillActive = listing.status === "active";

  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <PageHeader
          breadcrumbs={[{ label: "בית", href: "/" }, { label: "מסירה ומכירה", href: "/marketplace" }, { label: listing.title }]}
          title={listing.title}
          description={categoryLabel}
        />

        <div className={styles.container}>
          <div className={styles.layout}>
            <div className={styles.gallery}>
              {listing.images.length > 0 ? (
                <div className={styles.imageGrid}>
                  {listing.images.map((image) => (
                    <div key={image.src} className={styles.imageWrap}>
                      <Image src={image.src} alt={image.alt} fill sizes="(max-width: 768px) 100vw, 480px" className={styles.image} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.imagePlaceholder} aria-hidden="true">
                  {listing.is_free ? <Package size={48} strokeWidth={1.5} /> : <Package size={48} strokeWidth={1.5} />}
                </div>
              )}
            </div>

            <div className={styles.details}>
              {!isStillActive && <p className={styles.statusBanner}>{MARKETPLACE_STATUS_LABEL[listing.status]}</p>}

              {priceLabel && <p className={styles.price}>{priceLabel}</p>}

              <div className={styles.tags}>
                <span className={styles.tag}>{categoryLabel}</span>
                {listing.condition && MARKETPLACE_CONDITION_LABEL[listing.condition] && (
                  <span className={styles.tag}>{MARKETPLACE_CONDITION_LABEL[listing.condition]}</span>
                )}
                {listing.area && <span className={styles.tag}>{listing.area}</span>}
              </div>

              <p className={styles.description}>{listing.description}</p>

              <p className={styles.publishedAt}>פורסם בתאריך {formatListingDate(listing.created_at)}</p>

              {isStillActive && (
                <div className={styles.actions}>
                  {whatsappUrl && (
                    <Button href={whatsappUrl} variant="whatsapp" target="_blank" rel="noopener noreferrer" icon={<WhatsAppIcon size={16} aria-hidden="true" />}>
                      וואטסאפ
                    </Button>
                  )}
                  {listing.phone && (
                    <Button href={`tel:${listing.phone}`} variant="secondary" icon={<Phone size={16} aria-hidden="true" />}>
                      התקשרו
                    </Button>
                  )}
                </div>
              )}

              <div className={styles.reportWrap}>
                <ReportListingButton listingId={listing.id} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
