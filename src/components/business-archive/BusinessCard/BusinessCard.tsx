import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, GraduationCap, HandHeart, MapPin, MessageCircle, Phone, Utensils, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Button } from "@/components/ui/Button";
import { getCategoryLabel } from "@/data/business-categories";
import type { Business } from "@/types/business";
import styles from "./BusinessCard.module.css";

const PLACEHOLDER_ICON: Record<string, typeof Utensils> = {
  אוכל: Utensils,
  חוגים: GraduationCap,
  'גמ"ח': HandHeart,
  שירותים: Wrench,
};

type BusinessCardProps = {
  business: Business;
};

/**
 * Reuses the same building blocks as the homepage's card (Card/CategoryTag/Button, same
 * Design Tokens) but is a separate component from src/components/home/FeaturedBusinessesSection/
 * BusinessCard: that one takes editor-settings-shaped props (BusinessCardContentSettings) and is
 * wired into the visual editor; this one takes a plain Business record from the full directory.
 * Unifying the two would mean forcing the editor's settings shape onto every archive listing (or
 * vice versa) — a bigger refactor than this phase calls for.
 */
export function BusinessCard({ business }: BusinessCardProps) {
  const categoryIds = business.categoryIds ?? [];
  const primaryCategoryLabel = categoryIds[0] ? (getCategoryLabel(categoryIds[0]) ?? business.category) : business.category;
  const extraCategoryCount = Math.max(categoryIds.length - 1, 0);
  const PlaceholderIcon = PLACEHOLDER_ICON[business.category] ?? Utensils;
  const description = business.shortDescription || business.description;
  const locationLabel = business.serviceArea || business.address;

  return (
    <Card noPadding className={styles.card} data-testid="archive-business-card">
      <Link href={`/businesses/${business.slug}`} className={styles.imageLink} aria-label={business.name}>
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
          {business.verified && (
            <span className={styles.verifiedBadge}>
              <BadgeCheck size={14} aria-hidden="true" />
              עסק מאומת
            </span>
          )}
        </div>
      </Link>

      <div className={styles.body}>
        <div className={styles.tags}>
          <CategoryTag label={primaryCategoryLabel} category={business.category} />
          {extraCategoryCount > 0 && <span className={styles.extraTag}>{`+${extraCategoryCount}`}</span>}
        </div>

        <h3 className={styles.name}>
          <Link href={`/businesses/${business.slug}`}>{business.name}</Link>
        </h3>

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
              href={business.phone}
              variant="secondary"
              size="compact"
              icon={<Phone size={15} aria-hidden="true" />}
              data-analytics-event="archive-business-call-click"
            >
              התקשרו
            </Button>
          )}
          {business.whatsappUrl && (
            <Button
              href={business.whatsappUrl}
              variant="whatsapp"
              size="compact"
              icon={<MessageCircle size={15} aria-hidden="true" />}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="archive-business-whatsapp-click"
            >
              וואטסאפ
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
