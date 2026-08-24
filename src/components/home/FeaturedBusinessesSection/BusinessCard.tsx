import type { CSSProperties } from "react";
import Image from "next/image";
import { GraduationCap, HandHeart, Utensils, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Button } from "@/components/ui/Button";
import { colorTokenToCssVar } from "@/styles/token-to-css-variable";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
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

/**
 * The exact glyphs from the Figma card (node 28:10) — kept local to this component rather than
 * swapping the shared WhatsAppIcon/lucide Phone icon, since those are used across many other
 * pages that this redesign wasn't asked to change. Always rendered white per the source file
 * (the WhatsApp button pairs a white glyph with navy label text; the call button is white-on-navy
 * throughout), so both use a literal white fill rather than currentColor.
 */
function WhatsAppGlyph() {
  return (
    <svg width="29" height="29" viewBox="0 0 29.0082 29.0082" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M0 29L2.08728 21.2459C0.903939 19.123 0.287617 16.7459 0.287617 14.3279C0.279399 6.42623 6.72202 0 14.6438 0C22.5656 0 29.0082 6.42623 29.0082 14.3279C29.0082 22.2295 22.5656 28.6557 14.6438 28.6557C12.2689 28.6557 9.91867 28.0574 7.81496 26.918L0 29.0082L0 29ZM8.20941 24.0082L8.70247 24.3033C10.5103 25.377 12.5647 25.9426 14.6438 25.9426C21.0618 25.9426 26.2882 20.7295 26.2882 14.3279C26.2882 7.92623 21.0618 2.70492 14.6438 2.70492C8.22584 2.70492 2.99943 7.91803 2.99943 14.3279C2.99943 16.4426 3.5911 18.5246 4.70048 20.3525L5.00453 20.8443L3.83763 25.1721L8.20119 24.0082H8.20941Z"
        fill="#fff"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.9853 16.3197C19.3936 15.9672 18.6211 15.5738 17.9309 15.8607C17.3967 16.082 17.0516 16.9098 16.7064 17.3361C16.5256 17.5574 16.3202 17.5902 16.0408 17.4754C14.0357 16.6803 12.499 15.3443 11.3896 13.5C11.2006 13.2131 11.2335 12.9918 11.4636 12.7213C11.8005 12.3279 12.2196 11.8852 12.31 11.3525C12.4004 10.8197 12.1539 10.2049 11.932 9.7377C11.6526 9.13934 11.3403 8.27869 10.7322 7.93443C10.1734 7.62295 9.44205 7.79508 8.94899 8.19672C8.09436 8.89344 7.68348 9.97541 7.6917 11.0574C7.6917 11.3607 7.73279 11.6721 7.80674 11.9672C7.97931 12.6803 8.30802 13.3443 8.67781 13.9754C8.95721 14.4508 9.26126 14.9098 9.58997 15.3607C10.6665 16.8115 11.9977 18.0738 13.5426 19.0246C14.3151 19.5 15.1451 19.9098 16.0079 20.1967C16.9694 20.5164 17.8322 20.8443 18.8759 20.6475C19.9688 20.4426 21.0453 19.7705 21.4809 18.7213C21.6124 18.4098 21.6699 18.0656 21.6041 17.7377C21.4562 17.0574 20.5358 16.6557 19.9853 16.3279V16.3197Z"
        fill="#fff"
      />
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg width="23" height="23" viewBox="0 0 23.0018 23.0021" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M21.8327 16.4871L18.9027 14.9075C18.187 14.5201 17.6353 14.8032 17.0165 15.6452C15.667 17.5004 15.011 17.8654 13.3559 16.9416C11.8126 16.0773 10.7017 15.0566 9.31501 13.6707C7.9283 12.2849 6.89945 11.1822 6.04208 9.63252C5.11761 7.97849 5.48292 7.32284 7.33932 5.97428C8.18179 5.36333 8.46509 4.80454 8.07741 4.08928L6.49686 1.16119C5.85569 -0.0756071 4.94613 -0.217168 3.58924 0.237318C1.72539 0.870619 -0.086283 3.56774 0.0031821 4.84179C0.271578 8.58199 2.14289 13.0672 6.04208 16.9639C9.94127 20.8606 14.4294 22.7307 18.1721 22.9989C19.4544 23.0883 22.1309 21.2704 22.7646 19.4003C23.2194 18.0443 23.0777 17.1353 21.8327 16.4871Z"
        fill="#fff"
      />
      <path
        d="M13.0651 5.20687C12.4463 5.20687 11.9542 5.71351 11.9542 6.33191C11.9542 6.94286 12.4612 7.44205 13.0726 7.44205C13.08 7.44205 13.0949 7.44205 13.1024 7.44205C13.7659 7.44205 14.3922 7.69537 14.8619 8.16476C15.3315 8.63414 15.5925 9.26744 15.585 9.938C15.585 10.5564 16.0771 11.063 16.6959 11.063H16.7033C17.3147 11.063 17.8142 10.5713 17.8217 9.9529C17.8291 8.67885 17.3445 7.4793 16.4424 6.57778C15.5403 5.67626 14.3251 5.20687 13.0651 5.19942V5.20687ZM19.7377 3.29206C17.9559 1.51137 15.5552 0.535342 13.0651 0.542793C12.4463 0.542793 11.9468 1.04943 11.9542 1.66783C11.9542 2.28623 12.4538 2.77797 13.0726 2.77797C13.0726 2.77797 13.0949 2.77797 13.1024 2.77797C15.011 2.77797 16.8077 3.52303 18.1572 4.87159C19.5066 6.22015 20.2596 8.03064 20.2521 9.9529C20.2521 10.5713 20.7516 11.0705 21.363 11.0779C21.9818 11.0779 22.4813 10.5787 22.4813 9.9678C22.4888 7.4495 21.5121 5.08021 19.7302 3.29951L19.7377 3.29206Z"
        fill="#fff"
      />
    </svg>
  );
}

type BusinessCardProps = {
  card: BusinessCardContentSettings;
  appearance: FeaturedBusinessesEditorSettings["appearance"];
};

export function BusinessCard({ card, appearance }: BusinessCardProps) {
  const PlaceholderIcon = PLACEHOLDER_ICON[card.category] ?? Utensils;
  const placeholderClass = PLACEHOLDER_CLASS[card.category] ?? styles.default;
  const whatsappLink = card.whatsappUrl ? createWhatsappLink(card.whatsappUrl) : "";
  // cardUrl is the sole, authoritative link signal (set by mapBusinessToTeaserCard only when
  // the business actually has an accessible public profile) — a business without one must stay
  // fully non-clickable, both name and image, rather than fall back to a slug-guessed URL that
  // could point at a page the visitor isn't allowed to see.
  const profileHref = card.cardUrl;

  const cardStyle = {
    // Set as real properties (not custom-property overrides) so they reliably win over
    // Card.module.css's own hardcoded background/radius/shadow regardless of CSS Modules
    // stylesheet ordering — inline style always beats an external class at equal specificity.
    background: colorTokenToCssVar(appearance.cardBackgroundColorToken),
    // Pixel-matched to the Figma card (node 28:10) — literal, not appearance.cardRadiusToken/
    // cardShadowToken driven, since neither existing preset reaches these exact values.
    borderRadius: "22px",
    boxShadow: "0px 4px 20px 1px rgba(21, 27, 56, 0.4)",
    "--card-text-color": colorTokenToCssVar(appearance.textColorToken),
  } as CSSProperties;

  const imageContent = card.image.src ? (
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
  );

  return (
    <Card hoverable={appearance.cardHoverEffect === "lift"} className={styles.card} style={cardStyle} data-testid="business-card">
      {profileHref ? (
        <a href={profileHref} className={styles.imageArea} aria-label={card.name}>
          {imageContent}
        </a>
      ) : (
        <div className={styles.imageArea}>{imageContent}</div>
      )}

      <div className={styles.body}>
        <CategoryTag label={card.category} category={card.category} className={styles.tag} />
        <h3 className={styles.name}>{profileHref ? <a href={profileHref}>{card.name}</a> : card.name}</h3>
        <p className={styles.description}>{card.description}</p>

        <div className={styles.actions}>
          {card.phone && (
            <Button
              href={`tel:${normalizePhoneForTelLink(card.phone)}`}
              variant={appearance.buttonVariant}
              icon={<PhoneGlyph />}
              data-analytics-event="business-call-click"
            >
              {card.callButtonLabel}
            </Button>
          )}
          {whatsappLink && (
            <Button
              href={whatsappLink}
              variant="whatsapp"
              icon={<WhatsAppGlyph />}
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
