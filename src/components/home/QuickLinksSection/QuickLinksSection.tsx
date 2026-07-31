import type { CSSProperties } from "react";
import { Phone } from "lucide-react";
import {
  colorTokenToCssVar,
  containerWidthTokenToCssValue,
  radiusTokenToCssVar,
  shadowTokenToCssVar,
  spacingTokenToCssVar,
} from "@/styles/token-to-css-variable";
import { ICON_TOKEN_COMPONENT } from "@/styles/icon-token-map";
import type { QuickLinksEditorSettings } from "@/editor/schemas/quick-links.schema";
import styles from "./QuickLinksSection.module.css";

const COLOR_CLASS: Record<string, string> = {
  yellow: styles.yellow,
  green: styles.green,
  blue: styles.blue,
};

const ICON_SIZE_PX: Record<"sm" | "md" | "lg", number> = { sm: 18, md: 22, lg: 28 };

const HOVER_EFFECT_VARS: Record<QuickLinksEditorSettings["appearance"]["itemHoverEffect"], { bg: string; transform: string }> = {
  none: { bg: "transparent", transform: "none" },
  background: { bg: "var(--slate-50)", transform: "none" },
  lift: { bg: "var(--slate-50)", transform: "translateY(-2px)" },
};

type QuickLinksSectionProps = {
  settings: QuickLinksEditorSettings;
};

export function QuickLinksSection({ settings }: QuickLinksSectionProps) {
  const visibleItems = settings.content.items.filter((item) => item.visible);
  const hoverEffect = HOVER_EFFECT_VARS[settings.appearance.itemHoverEffect];

  const sectionStyle = {
    "--quicklinks-container-max-width": containerWidthTokenToCssValue(settings.layout.containerMaxWidth),
    "--quicklinks-padding-block": spacingTokenToCssVar(settings.layout.paddingBlock),
    "--quicklinks-padding-inline": spacingTokenToCssVar(settings.layout.paddingInline),
    "--quicklinks-panel-bg": colorTokenToCssVar(settings.appearance.panelBackgroundColorToken),
    "--quicklinks-panel-radius": radiusTokenToCssVar(settings.appearance.panelRadiusToken),
    "--quicklinks-panel-shadow": shadowTokenToCssVar(settings.appearance.panelShadowToken),
    "--quicklinks-card-color": colorTokenToCssVar(settings.appearance.cardColorToken),
    "--quicklinks-text-color": colorTokenToCssVar(settings.appearance.textColorToken),
    "--quicklinks-columns-desktop": settings.layout.columnsDesktop,
    "--quicklinks-columns-tablet": settings.layout.columnsTablet,
    "--quicklinks-columns-mobile": settings.layout.columnsMobile,
    "--quicklinks-gap": spacingTokenToCssVar(settings.layout.gap),
    "--quicklinks-justify": settings.layout.contentAlignment,
    "--quicklinks-item-padding": spacingTokenToCssVar(settings.layout.itemPadding),
    "--quicklinks-icon-size": `${ICON_SIZE_PX[settings.layout.iconSize]}px`,
    "--quicklinks-hover-bg": hoverEffect.bg,
    "--quicklinks-hover-transform": hoverEffect.transform,
  } as CSSProperties;

  return (
    <section id="quick-links" className={styles.section} aria-label="קישורים מהירים" style={sectionStyle}>
      {settings.visibility.showSectionTitle && settings.content.sectionTitle && (
        <h2 className={styles.sectionTitle}>{settings.content.sectionTitle}</h2>
      )}
      <div className={styles.panel}>
        {visibleItems.map((item) => {
          const Icon = ICON_TOKEN_COMPONENT[item.icon] ?? Phone;
          return (
            <a key={item.id} href={item.href} className={styles.link}>
              <span className={`${styles.iconWrap} ${COLOR_CLASS[item.colorVariant]}`}>
                <Icon size={ICON_SIZE_PX[settings.layout.iconSize]} aria-hidden="true" />
              </span>
              <span className={styles.label}>{item.label}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
