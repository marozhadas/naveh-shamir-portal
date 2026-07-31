import type { CSSProperties } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { colorTokenToCssVar, containerWidthTokenToCssValue, spacingTokenToCssVar } from "@/styles/token-to-css-variable";
import type { FeaturedBusinessesEditorSettings } from "@/editor/schemas/businesses.schema";
import { BusinessCard } from "./BusinessCard";
import styles from "./FeaturedBusinessesSection.module.css";

type FeaturedBusinessesSectionProps = {
  settings: FeaturedBusinessesEditorSettings;
};

export function FeaturedBusinessesSection({ settings }: FeaturedBusinessesSectionProps) {
  const orderedCards = settings.content.cardsOrder
    .map((id) => settings.content.cards.find((card) => card.id === id))
    .filter((card): card is (typeof settings.content.cards)[number] => card !== undefined && card.visible)
    .slice(0, settings.content.visibleCount);

  const sectionStyle = {
    "--section-bg": colorTokenToCssVar(settings.appearance.sectionBackgroundColorToken),
    "--section-title-color": colorTokenToCssVar(settings.appearance.titleColorToken),
    "--section-title-align": settings.layout.titleAlignment,
    "--section-container-max-width": containerWidthTokenToCssValue(settings.layout.containerMaxWidth),
    "--section-padding-block-start": spacingTokenToCssVar(settings.layout.sectionPaddingBlock.start),
    "--section-padding-block-end": spacingTokenToCssVar(settings.layout.sectionPaddingBlock.end),
    "--businesses-grid-gap": spacingTokenToCssVar(settings.layout.gap),
    "--businesses-columns-desktop": settings.layout.columnsDesktop,
    "--businesses-columns-tablet": settings.layout.columnsTablet,
    "--businesses-columns-mobile": settings.layout.columnsMobile,
  } as CSSProperties;

  return (
    <section id="businesses" className={styles.section} aria-labelledby="businesses-heading" style={sectionStyle}>
      {settings.content.sectionTitle && <SectionHeader id="businesses-heading">{settings.content.sectionTitle}</SectionHeader>}
      <div className={styles.grid}>
        {orderedCards.map((card) => (
          <BusinessCard key={card.id} card={card} appearance={settings.appearance} />
        ))}
      </div>
      {settings.content.showAllLinkVisible && settings.content.showAllLinkHref && (
        <div className={styles.showAllWrap}>
          <Button href={settings.content.showAllLinkHref} variant="secondary">
            {settings.content.showAllLinkLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
