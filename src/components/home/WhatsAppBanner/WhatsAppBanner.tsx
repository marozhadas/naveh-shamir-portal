import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { colorTokenToCssVar, containerWidthTokenToCssValue, radiusTokenToCssVar, shadowTokenToCssVar, spacingTokenToCssVar } from "@/styles/token-to-css-variable";
import { ICON_TOKEN_COMPONENT } from "@/styles/icon-token-map";
import type { WhatsAppBannerEditorSettings } from "@/editor/schemas/whatsapp.schema";
import styles from "./WhatsAppBanner.module.css";

type WhatsAppBannerProps = {
  settings: WhatsAppBannerEditorSettings;
};

export function WhatsAppBanner({ settings }: WhatsAppBannerProps) {
  const Icon = ICON_TOKEN_COMPONENT[settings.visibility.iconName] ?? WhatsAppIcon;

  const sectionStyle = {
    "--whatsapp-display-mobile": settings.visibility.hideOnMobile ? "none" : "block",
  } as CSSProperties;

  const bannerStyle = {
    background: colorTokenToCssVar(settings.appearance.backgroundColorToken),
    borderRadius: radiusTokenToCssVar(settings.appearance.radiusToken),
    boxShadow: shadowTokenToCssVar(settings.appearance.shadowToken),
    "--whatsapp-title-color": colorTokenToCssVar(settings.appearance.titleColorToken),
    "--whatsapp-description-color": colorTokenToCssVar(settings.appearance.descriptionColorToken),
    "--whatsapp-max-width": containerWidthTokenToCssValue(settings.layout.maxContentWidth),
    "--whatsapp-justify": settings.layout.contentAlignment,
    // text-align only understands start/center/end — "space-between" (a valid justify-content
    // value, meaningless for text-align) falls back to the base RTL default instead.
    "--whatsapp-text-align": settings.layout.contentAlignment === "space-between" ? "start" : settings.layout.contentAlignment,
    "--whatsapp-direction": settings.layout.direction,
    "--whatsapp-gap": spacingTokenToCssVar(settings.layout.gap),
    "--whatsapp-padding-block-start": spacingTokenToCssVar(settings.layout.paddingBlock.start),
    "--whatsapp-padding-block-end": spacingTokenToCssVar(settings.layout.paddingBlock.end),
  } as CSSProperties;

  return (
    <section
      id="whatsapp"
      className={styles.section}
      aria-labelledby={settings.content.title ? "whatsapp-heading" : undefined}
      aria-label={settings.content.title ? undefined : "קבוצת הוואטסאפ של השכונה"}
      style={sectionStyle}
    >
      <div className={styles.banner} style={bannerStyle}>
        <div>
          {settings.content.title && (
            <h2 id="whatsapp-heading" className={styles.title}>
              {settings.content.title}
            </h2>
          )}
          {settings.content.description && <p className={styles.subtitle}>{settings.content.description}</p>}
        </div>
        {settings.content.buttonLabel && (
          <Button
            href={settings.content.whatsappUrl}
            variant={settings.appearance.buttonVariant}
            target="_blank"
            rel="noopener noreferrer"
            icon={settings.visibility.showIcon ? <Icon size={18} aria-hidden="true" /> : undefined}
            data-analytics-event="whatsapp-group-join-click"
          >
            {settings.content.buttonLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
