import type { CSSProperties } from "react";
import Image from "next/image";
import { EMERGENCY_NUMBERS, SITE_CONFIG } from "@/data/config";
import { colorTokenToCssVar, spacingTokenToCssVar } from "@/styles/token-to-css-variable";
import type { FooterEditorSettings } from "@/editor/schemas/footer.schema";
import styles from "./Footer.module.css";

const LOGO_SIZE_PX: Record<FooterEditorSettings["appearance"]["logoSizeToken"], string> = {
  sm: "28px",
  md: "36px",
  lg: "48px",
};

type FooterProps = {
  settings: FooterEditorSettings;
};

export function Footer({ settings }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const visibleNavItems = settings.content.navItems.filter((item) => item.visible);

  const footerStyle = {
    "--footer-bg": colorTokenToCssVar(settings.appearance.backgroundColorToken),
    "--footer-text-color": colorTokenToCssVar(settings.appearance.textColorToken),
    "--footer-link-color": colorTokenToCssVar(settings.appearance.linkColorToken),
    "--footer-link-hover-color": colorTokenToCssVar(settings.appearance.linkHoverColorToken),
    "--footer-border-color": colorTokenToCssVar(settings.appearance.borderColorToken),
    "--footer-gap": spacingTokenToCssVar(settings.layout.gap),
    "--footer-padding-block-start": spacingTokenToCssVar(settings.layout.paddingBlockStart),
    "--footer-columns-desktop": settings.layout.columnsDesktop,
    "--footer-columns-tablet": settings.layout.columnsTablet,
    "--footer-content-justify": settings.layout.contentAlignment,
    "--footer-logo-size": LOGO_SIZE_PX[settings.appearance.logoSizeToken],
  } as CSSProperties;

  return (
    <footer id="site-footer" className={styles.footer} style={footerStyle}>
      <div className={styles.grid}>
        <div>
          <Image
            src={settings.content.logo.src}
            alt={settings.content.logo.alt}
            width={296}
            height={152}
            className={styles.brandLogo}
            style={{ objectFit: settings.content.logo.objectFit }}
          />
          {settings.content.description && <p className={styles.brandDescription}>{settings.content.description}</p>}
        </div>

        {visibleNavItems.length > 0 && (
          <nav aria-label="ניווט (פוטר)">
            <div className={styles.columnTitle}>{settings.content.navColumnTitle}</div>
            <ul className={styles.linkList}>
              {visibleNavItems.map((link) => (
                <li key={link.id}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div id="essential">
          <div className={styles.columnTitle}>{settings.content.essentialColumnTitle}</div>
          <dl className={styles.essentialList}>
            {EMERGENCY_NUMBERS.map((entry) => (
              <div key={entry.id} className={styles.essentialItem}>
                <dt>{entry.label}</dt>
                <dd>
                  <a href={`tel:${entry.number}`}>{entry.number}</a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span>
          © {currentYear} {SITE_CONFIG.name}
        </span>
        {settings.content.showLegalLinks && (
          <nav aria-label="קישורים משפטיים" className={styles.legalLinks}>
            {settings.content.legalLinks.map((link) => (
              <a key={link.id} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        )}
        <span>
          {settings.content.creditUrl ? (
            <a href={settings.content.creditUrl} target="_blank" rel="noopener noreferrer">
              {settings.content.creditText}
            </a>
          ) : (
            settings.content.creditText
          )}
        </span>
      </div>
    </footer>
  );
}
