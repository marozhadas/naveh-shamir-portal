import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Gift, MapPin, Package } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getMarketplaceCategoryLabel } from "@/data/marketplace-categories";
import { MARKETPLACE_CONDITION_LABEL } from "@/types/marketplace";
import { formatListingDate } from "@/utils/format-listing-date";
import type { MarketplaceListingRow } from "@/types/marketplace";
import styles from "./MarketplaceListingCard.module.css";

type MarketplaceListingCardProps = {
  listing: MarketplaceListingRow;
};

/** No phone/WhatsApp on the card itself (spec) — contact details only appear on the full item page. */
export function MarketplaceListingCard({ listing }: MarketplaceListingCardProps) {
  const href = `/marketplace/${listing.slug}`;
  const categoryLabel = getMarketplaceCategoryLabel(listing.category_id) ?? listing.category_id;
  const coverImage = listing.images[0];
  const priceLabel = listing.is_free ? "למסירה" : listing.price !== null ? `${listing.price} ₪` : null;

  return (
    <Card noPadding className={styles.card} data-testid="marketplace-listing-card">
      <Link href={href} className={styles.imageLink} aria-label={listing.title}>
        <div className={styles.imageArea}>
          {coverImage ? (
            <Image src={coverImage.src} alt={coverImage.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className={styles.image} />
          ) : (
            <div className={styles.placeholder} aria-hidden="true">
              {listing.is_free ? <Gift size={32} strokeWidth={1.5} /> : <Package size={32} strokeWidth={1.5} />}
            </div>
          )}
          {priceLabel && <span className={styles.priceBadge}>{priceLabel}</span>}
        </div>
      </Link>

      <div className={styles.body}>
        <div className={styles.tags}>
          <span className={styles.categoryTag}>{categoryLabel}</span>
          {listing.condition && MARKETPLACE_CONDITION_LABEL[listing.condition] && (
            <span className={styles.conditionTag}>{MARKETPLACE_CONDITION_LABEL[listing.condition]}</span>
          )}
        </div>

        <h3 className={styles.title}>
          <Link href={href}>{listing.title}</Link>
        </h3>

        {listing.description && <p className={styles.description}>{listing.description}</p>}

        <div className={styles.meta}>
          {listing.area && (
            <span className={styles.metaItem}>
              <MapPin size={13} aria-hidden="true" />
              {listing.area}
            </span>
          )}
          <span className={styles.metaItem}>{formatListingDate(listing.created_at)}</span>
        </div>

        <Button href={href} variant="secondary" size="compact" icon={<ArrowLeft size={15} aria-hidden="true" />} fullWidth>
          צפייה בפרטים
        </Button>
      </div>
    </Card>
  );
}
