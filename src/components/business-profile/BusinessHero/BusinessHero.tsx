import Image from "next/image";
import { Globe, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { VerifiedBusinessBadge } from "@/components/ui/VerifiedBusinessBadge/VerifiedBusinessBadge";
import { ShareButton } from "@/components/business-profile/ShareButton/ShareButton";
import { getCategoryLabel } from "@/data/business-categories";
import { SITE_CONFIG } from "@/data/config";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
import { getBusinessAddressLine, getBusinessContact, getBusinessHeroImage, getBusinessServiceArea } from "@/utils/business-profile";
import { getBusinessOpenStatus } from "@/utils/get-business-open-status";
import type { Business } from "@/types/business";
import type { BusinessListingAccess } from "@/types/business-listing-access";
import styles from "./BusinessHero.module.css";

type BusinessHeroProps = {
  business: Business;
  access: BusinessListingAccess;
};

export function BusinessHero({ business, access }: BusinessHeroProps) {
  const primaryCategoryId = business.categoryIds?.[0];
  const primaryCategoryLabel = primaryCategoryId ? (getCategoryLabel(primaryCategoryId) ?? business.category) : business.category;
  const heroImage = getBusinessHeroImage(business);
  const contact = getBusinessContact(business);
  const addressLine = getBusinessAddressLine(business);
  const serviceArea = getBusinessServiceArea(business);
  const openStatus = getBusinessOpenStatus(business.openingHours, new Date());
  const whatsappLink = contact.whatsappUrl ? createWhatsappLink(contact.whatsappUrl) : "";
  const shareUrl = `${SITE_CONFIG.siteUrl}/businesses/${business.slug}`;

  return (
    <section className={styles.hero} aria-labelledby="business-name">
      <div className={styles.imageArea}>
        {heroImage.src ? (
          <Image src={heroImage.src} alt={heroImage.alt} fill sizes="(max-width: 768px) 100vw, 480px" className={styles.image} priority />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.tagsRow}>
          <CategoryTag label={primaryCategoryLabel} category={business.category} />
          {access.canShowVerifiedBadge && <VerifiedBusinessBadge />}
          {openStatus && (
            <span className={`${styles.openBadge} ${openStatus.isOpenNow ? styles.openNow : styles.closedNow}`}>
              {openStatus.label}
            </span>
          )}
        </div>

        <h1 id="business-name" className={styles.name}>
          {business.name}
        </h1>

        {business.shortDescription && <p className={styles.shortDescription}>{business.shortDescription}</p>}

        {(addressLine || serviceArea) && (
          <p className={styles.location}>
            <MapPin size={15} aria-hidden="true" />
            {addressLine || serviceArea}
          </p>
        )}

        <div className={styles.actions}>
          {whatsappLink && (
            <Button
              href={whatsappLink}
              variant="whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              icon={<WhatsAppIcon size={16} aria-hidden="true" />}
              data-analytics-event="business_whatsapp_click"
              data-analytics-business-id={business.id}
              data-analytics-category={business.category}
            >
              וואטסאפ
            </Button>
          )}
          {contact.phone && (
            <Button
              href={contact.phone}
              variant="secondary"
              icon={<Phone size={16} aria-hidden="true" />}
              data-analytics-event="business_phone_click"
              data-analytics-business-id={business.id}
              data-analytics-category={business.category}
            >
              התקשרו
            </Button>
          )}
          {contact.websiteUrl && (
            <Button href={contact.websiteUrl} variant="secondary" target="_blank" rel="noopener noreferrer" icon={<Globe size={16} aria-hidden="true" />}>
              לאתר העסק
            </Button>
          )}
          <ShareButton title={business.name} text={business.shortDescription} url={shareUrl} />
        </div>
      </div>
    </section>
  );
}
