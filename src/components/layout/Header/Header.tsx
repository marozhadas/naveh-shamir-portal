"use client";

import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  colorTokenToCssVar,
  containerWidthTokenToCssValue,
  shadowTokenToCssVar,
  spacingTokenToCssVar,
} from "@/styles/token-to-css-variable";
import type { HeaderEditorSettings } from "@/editor/schemas/header.schema";
import styles from "./Header.module.css";

type HeaderProps = {
  settings: HeaderEditorSettings;
};

export function Header({ settings }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelId = useId();
  const visibleNavItems = settings.content.navItems.filter((item) => item.visible);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const headerStyle = {
    "--header-bg": colorTokenToCssVar(settings.appearance.backgroundColorToken),
    "--header-text-color": colorTokenToCssVar(settings.appearance.textColorToken),
    "--header-link-color": colorTokenToCssVar(settings.appearance.linkColorToken),
    "--header-shadow": shadowTokenToCssVar(settings.appearance.headerShadow),
    "--header-position": settings.appearance.sticky ? "sticky" : "static",
    "--header-max-width": containerWidthTokenToCssValue(settings.layout.containerMaxWidth),
    "--header-nav-gap": spacingTokenToCssVar(settings.layout.navItemGap),
    "--header-logo-nav-gap": spacingTokenToCssVar(settings.layout.logoNavGap),
    "--header-desktop-nav-display": settings.layout.showDesktopNav ? "flex" : "none",
  } as CSSProperties;

  return (
    <header className={scrolled ? `${styles.header} ${styles.scrolled}` : styles.header} style={headerStyle}>
      <div className={styles.inner}>
        <Link href="/#top" className={styles.logoLink}>
          <Image
            src={settings.content.logo.src}
            alt={settings.content.logo.alt}
            width={296}
            height={152}
            className={styles.logo}
            style={{ objectFit: settings.content.logo.objectFit }}
            priority
          />
        </Link>

        <nav className={styles.desktopNav} aria-label="ניווט ראשי">
          <ul className={styles.navList}>
            {visibleNavItems.map((link) => (
              <li key={link.id}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {settings.content.showPersonalAreaButton && (
            <div className={styles.desktopOnly}>
              <Button
                variant="secondary"
                disabled
                icon={<UserRound size={18} aria-hidden="true" />}
                title="בקרוב"
                className={styles.personalAreaButton}
              >
                {settings.content.personalAreaLabel}
              </Button>
            </div>
          )}
          <div className={styles.desktopOnly}>
            <Button href={settings.content.ctaHref} variant={settings.appearance.ctaVariant} className={styles.ctaButton}>
              {settings.content.ctaLabel}
            </Button>
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={26} aria-hidden="true" /> : <Menu size={26} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id={panelId} className={styles.mobilePanel} hidden={!open}>
        <nav aria-label="ניווט ראשי (מובייל)">
          <ul className={styles.mobileNavList}>
            {visibleNavItems.map((link) => (
              <li key={link.id}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.mobileActions}>
          <Button
            href={settings.content.ctaHref}
            variant={settings.appearance.ctaVariant}
            fullWidth
            onClick={() => setOpen(false)}
            className={styles.ctaButton}
          >
            {settings.content.ctaLabel}
          </Button>
          {settings.content.showPersonalAreaButton && (
            <Button
              variant="secondary"
              disabled
              fullWidth
              icon={<UserRound size={18} aria-hidden="true" />}
              title="בקרוב"
              className={styles.personalAreaButton}
            >
              {settings.content.personalAreaLabel}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
