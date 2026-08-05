import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, GraduationCap, HandHeart, MapPin, Phone, Utensils, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { VerifiedBusinessBadge } from "@/components/ui/VerifiedBusinessBadge/VerifiedBusinessBadge";
import { getCategoryLabel } from "@/data/business-categories";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
import { normalizePhoneForTelLink } from "@/utils/normalize-phone-for-tel-link";
import type { Business } from "@/types/business";
import type { BusinessListingAccess } from "@/types/business-listing-access";
import styles from "./BusinessCard.module.css";

const PLACEHOLDER_ICON: Record<string, typeof Utensils> = {
  אוכל: Utensils,
  חוגים: GraduationCap,
  'גמ"ח': HandHeart,
  שירותים: Wrench,
};

type BusinessCardProps = {
  business: Business;
  access: BusinessListingAccess;
  /** Purely for future layout variants — both currently render identically. */
  variant?: "archive" | "related";
};

/**
 * Reuses the same building blocks as the homepage's card (Card/CategoryTag/Button, same
 * Design Tokens) but is a separate component from src/components/home/FeaturedBusinessesSection/
 * BusinessCard: that one takes editor-settings-shaped props (BusinessCardContentSettings) and is
 * wired into the visual editor; this one takes a plain Business record from the full directory.
 *
 * Whether the card is clickable is driven entirely by `access.canOpenProfile` — never by
 * `business.verified`, which no longer controls anything here (spec section 6/7). A basic-tier
 * business renders no <Link> at all (not a disabled-looking one, not one with pointer-events
 * blocked via CSS): the DOM simply has nothing to navigate with.
 */
export function BusinessCard({ business, access }: BusinessCardProps) {
  const categoryIds = business.categoryIds ?? [];
  const primaryCategoryLabel = categoryIds[0] ? (getCategoryLabel(categoryIds[0]) ?? business.category) : business.category;
  const extraCategoryCount = Math.max(categoryIds.length - 1, 0);
  const PlaceholderIcon = PLACEHOLDER_ICON[business.category] ?? Utensils;
  const description = business.shortDescription || business.description;
  const locationLabel = business.serviceArea || business.address;
  const isPremium = access.canOpenProfile;
  const profileHref = `/businesses/${business.slug}`;
  const whatsappLink = business.whatsappUrl ? createWhatsappLink(business.whatsappUrl) : "";

  const imageContent = (
    <div className={styles.imageArea}>
      {business.imageUrl ? (
        <Image
          src={business.imageUrl}
          alt={business.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={styles.image}
        />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <PlaceholderIcon size={36} strokeWidth={1.5} />
        </div>
      )}
      {access.canShowVerifiedBadge && <VerifiedBusinessBadge className={styles.verifiedBadgeOverlay} />}
    </div>
  );

  return (
    <Card noPadding hoverable={isPremium} className={`${styles.card} ${isPremium ? "" : styles.basicCard}`} data-testid="archive-business-card">
      {isPremium ? (
        <Link href={profileHref} className={styles.imageLink} aria-label={business.name}>
          {imageContent}
        </Link>
      ) : (
        imageContent
      )}

      <div className={styles.body}>
        <div className={styles.tags}>
          <CategoryTag label={primaryCategoryLabel} category={business.category} />
          {extraCategoryCount > 0 && <span className={styles.extraTag}>{`+${extraCategoryCount}`}</span>}
          {!isPremium && <span className={styles.basicTag}>רישום בסיסי</span>}
        </div>

        <h3 className={styles.name}>{isPremium ? <Link href={profileHref}>{business.name}</Link> : business.name}</h3>

        {description && <p className={styles.description}>{description}</p>}

        {locationLabel && (
          <p className={styles.location}>
            <MapPin size={14} aria-hidden="true" />
            {locationLabel}
          </p>
        )}

        <div className={styles.actions}>
          {business.phone && (
            <Button
              href={`tel:${normalizePhoneForTelLink(business.phone)}`}
              variant="secondary"
              size="compact"
              icon={<Phone size={15} aria-hidden="true" />}
              data-analytics-event="archive-business-call-click"
            >
              התקשרו
            </Button>
          )}
          {whatsappLink && (
            <Button
              href={whatsappLink}
              variant="whatsapp"
              size="compact"
              icon={<WhatsAppIcon size={15} aria-hidden="true" />}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="archive-business-whatsapp-click"
            >
              וואטסאפ
            </Button>
          )}
          {isPremium && (
            <Button href={profileHref} variant="secondary" size="compact" icon={<ArrowLeft size={15} aria-hidden="true" />}>
              לעמוד העסק
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
