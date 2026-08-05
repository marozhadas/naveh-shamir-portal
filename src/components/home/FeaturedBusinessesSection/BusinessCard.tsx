import type { CSSProperties } from "react";
import Image from "next/image";
import { GraduationCap, HandHeart, Phone, Utensils, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { colorTokenToCssVar, radiusTokenToCssVar, shadowTokenToCssVar } from "@/styles/token-to-css-variable";
import { normalizePhoneForTelLink } from "@/utils/normalize-phone-for-tel-link";
import type { BusinessCardContentSettings, FeaturedBusinessesEditorSettings } from "@/editor/schemas/businesses.schema";
import styles from "./BusinessCard.module.css";

const PLACEHOLDER_ICON: Record<string, typeof Utensils> = {
  אוכל: Utensils,
  חוגים: GraduationCap,
  'גמ"ח': HandHeart,
  שירותים: Wrench,
};

const PLACEHOLDER_CLASS: Record<string, string> = {
  אוכל: styles.food,
  חוגים: styles.classes,
  'גמ"ח': styles.gemach,
};

const ASPECT_RATIO_CSS: Record<FeaturedBusinessesEditorSettings["appearance"]["imageAspectRatio"], string> = {
  "1:1": "1 / 1",
  "4:3": "4 / 3",
  "16:9": "16 / 9",
};

type BusinessCardProps = {
  card: BusinessCardContentSettings;
  appearance: FeaturedBusinessesEditorSettings["appearance"];
};

export function BusinessCard({ card, appearance }: BusinessCardProps) {
  const PlaceholderIcon = PLACEHOLDER_ICON[card.category] ?? Utensils;
  const placeholderClass = PLACEHOLDER_CLASS[card.category] ?? styles.default;

  const cardStyle = {
    // Set as real properties (not custom-property overrides) so they reliably win over
    // Card.module.css's own hardcoded background/radius/shadow regardless of CSS Modules
    // stylesheet ordering — inline style always beats an external class at equal specificity.
    background: colorTokenToCssVar(appearance.cardBackgroundColorToken),
    borderRadius: radiusTokenToCssVar(appearance.cardRadiusToken),
    boxShadow: shadowTokenToCssVar(appearance.cardShadowToken),
    "--card-text-color": colorTokenToCssVar(appearance.textColorToken),
    "--card-image-aspect": ASPECT_RATIO_CSS[appearance.imageAspectRatio],
  } as CSSProperties;

  return (
    <Card noPadding hoverable={appearance.cardHoverEffect === "lift"} className={styles.card} style={cardStyle} data-testid="business-card">
      <div className={styles.imageArea}>
        {card.image.src ? (
          <Image
            src={card.image.src}
            alt={card.image.alt}
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            className={styles.image}
            style={{ objectFit: card.image.objectFit }}
          />
        ) : (
          <div className={`${styles.placeholder} ${placeholderClass}`} aria-hidden="true">
            <PlaceholderIcon size={36} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className={styles.body}>
        <CategoryTag label={card.category} category={card.category} />
        <h3 className={styles.name}>{card.cardUrl ? <a href={card.cardUrl}>{card.name}</a> : card.name}</h3>
        <p className={styles.description}>{card.description}</p>

        <div className={styles.actions}>
          {card.phone && (
            <Button
              href={`tel:${normalizePhoneForTelLink(card.phone)}`}
              variant={appearance.buttonVariant}
              size="compact"
              icon={<Phone size={15} aria-hidden="true" />}
              data-analytics-event="business-call-click"
            >
              {card.callButtonLabel}
            </Button>
          )}
          {card.whatsappUrl && (
            <Button
              href={card.whatsappUrl}
              variant="whatsapp"
              size="compact"
              icon={<WhatsAppIcon size={15} aria-hidden="true" />}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-event="business-whatsapp-click"
            >
              {card.whatsappButtonLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
