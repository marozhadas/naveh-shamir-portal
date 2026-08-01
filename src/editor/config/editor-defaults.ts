import { BUSINESSES } from "@/data/businesses";
import { EVENTS } from "@/data/events";
import { QUICK_LINKS } from "@/data/quick-links";
import { NAV_LINKS } from "@/data/navigation";
import { SITE_CONFIG, FOOTER_LEGAL_LINKS } from "@/data/config";
import { DEFAULT_HERO_SETTINGS } from "@/data/hero-content";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";
import type { HeaderEditorSettings } from "@/editor/schemas/header.schema";
import type { QuickLinksEditorSettings } from "@/editor/schemas/quick-links.schema";
import type { FeaturedBusinessesEditorSettings } from "@/editor/schemas/businesses.schema";
import type { UpcomingEventsEditorSettings } from "@/editor/schemas/events.schema";
import type { WhatsAppBannerEditorSettings } from "@/editor/schemas/whatsapp.schema";
import type { FooterEditorSettings } from "@/editor/schemas/footer.schema";

/**
 * Every value below is transcribed from the current, already-shipped homepage
 * implementation (components + src/data/*) — nothing here is a new design
 * decision. Where the live CSS uses a value outside the 4px spacing scale
 * (a handful of legacy px values from the original design export), the
 * nearest scale token is used and the gap is called out inline; those fields
 * render a few px off from the live page until the user actually touches them.
 */

export const defaultHeaderSettings: HeaderEditorSettings = {
  content: {
    logo: { src: "/images/logo-color.png", alt: "נווה שמיר — הפורטל של השכונה", objectFit: "contain" },
    ctaLabel: "הוספת עסק / מודעה",
    ctaHref: "/business/register",
    personalAreaLabel: "אזור אישי",
    personalAreaHref: "/account",
    showPersonalAreaButton: true,
    navItems: NAV_LINKS.map((link) => ({ id: link.id, label: link.label, href: link.href, visible: true })),
  },
  appearance: {
    backgroundColorToken: "surface",
    textColorToken: "text-primary",
    linkColorToken: "text-primary",
    ctaVariant: "primary",
    headerShadow: "none",
    sticky: true,
  },
  layout: {
    containerMaxWidth: "lg",
    // Live CSS uses 28px (not on the 4px scale); nearest token used here.
    navItemGap: "24",
    logoNavGap: "32",
    showDesktopNav: true,
  },
};

export const defaultHeroSettings = DEFAULT_HERO_SETTINGS;

export const defaultQuickLinksSettings: QuickLinksEditorSettings = {
  content: {
    sectionTitle: "",
    items: QUICK_LINKS.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon as QuickLinksEditorSettings["content"]["items"][number]["icon"],
      colorVariant: item.colorVariant,
      visible: true,
    })),
  },
  appearance: {
    panelBackgroundColorToken: "surface",
    panelRadiusToken: "lg",
    panelShadowToken: "card",
    itemHoverEffect: "background",
    cardColorToken: "surface",
    textColorToken: "text-primary",
  },
  layout: {
    // The live grid is fluid (auto-fit, minmax(130px,1fr)); these are the
    // fixed per-breakpoint counts closest to how it actually reflows today.
    columnsDesktop: 6,
    columnsTablet: 3,
    columnsMobile: 2,
    gap: "8",
    paddingBlock: "32",
    paddingInline: "16",
    containerMaxWidth: "lg",
    contentAlignment: "start",
    iconSize: "md",
    itemPadding: "16",
  },
  visibility: {
    showSectionTitle: false,
  },
};

export const defaultFeaturedBusinessesSettings: FeaturedBusinessesEditorSettings = {
  content: {
    sectionTitle: "הכירו את העסקים שלנו",
    showAllLinkVisible: false,
    showAllLinkLabel: "לכל העסקים",
    showAllLinkHref: "/businesses",
    visibleCount: 4,
    cardsOrder: BUSINESSES.map((b) => b.id),
    cards: BUSINESSES.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      category: b.category,
      description: b.description,
      image: { src: b.imageUrl, alt: b.imageAlt, objectFit: "cover" },
      callButtonLabel: "התקשרו",
      whatsappButtonLabel: "וואטסאפ",
      phone: b.phone ?? "",
      whatsappUrl: b.whatsappUrl ?? "",
      cardUrl: "",
      visible: true,
    })),
  },
  appearance: {
    sectionBackgroundColorToken: "background",
    titleColorToken: "text-primary",
    textColorToken: "text-secondary",
    cardBackgroundColorToken: "surface",
    cardRadiusToken: "lg",
    cardShadowToken: "card",
    // Category tag colors stay derived per-category (see CategoryTag component) —
    // a single global override would break the brand's category-color mapping.
    // Not exposed in the editor; revisit as a per-category override map in a future phase.
    imageAspectRatio: "4:3",
    cardHoverEffect: "lift",
    buttonVariant: "primary",
  },
  layout: {
    // Live grid is fluid (auto-fit, minmax(240px,1fr)); 4 is what it renders
    // as today with exactly 4 demo cards.
    columnsDesktop: 4,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: "20",
    containerMaxWidth: "lg",
    sectionPaddingBlock: { start: "64", end: "16" },
    titleAlignment: "start",
  },
};

export const defaultUpcomingEventsSettings: UpcomingEventsEditorSettings = {
  content: {
    sectionTitle: "הדופק השכונתי",
    showAllLinkVisible: false,
    showAllLinkLabel: "לכל האירועים",
    showAllLinkHref: "/events",
    visibleCount: 3,
    eventsOrder: EVENTS.map((e) => e.id),
    events: EVENTS.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: "",
      startDate: e.startDate,
      endDate: "",
      displayDay: e.displayDay,
      displayMonth: e.displayMonth,
      displayTime: e.displayTime,
      location: e.location,
      priceLabel: "",
      calendarUrl: e.calendarUrl ?? "",
      calendarButtonLabel: "הוסיפו ליומן",
      visible: true,
    })),
  },
  appearance: {
    sectionBackgroundColorToken: "background",
    cardBackgroundColorToken: "surface",
    textColorToken: "text-primary",
    dateBadgeAccentColorToken: "green",
    cardRadiusToken: "lg",
    cardShadowToken: "card",
    buttonVariant: "secondary",
  },
  layout: {
    // Live grid is fluid (auto-fit, minmax(260px,1fr)); 3 matches the 3 demo events today.
    columnsDesktop: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: "20",
    containerMaxWidth: "lg",
    sectionPaddingBlock: { start: "48", end: "64" },
    titleAlignment: "start",
  },
};

export const defaultWhatsAppBannerSettings: WhatsAppBannerEditorSettings = {
  content: {
    title: "הצטרפו לקבוצת הוואטסאפ של השכונה",
    description: "עדכונים, המלצות ועזרה הדדית — ישירות לנייד",
    buttonLabel: "הצטרפו עכשיו",
    whatsappUrl: SITE_CONFIG.whatsappCommunityUrl,
  },
  appearance: {
    backgroundColorToken: "success",
    titleColorToken: "text-primary",
    descriptionColorToken: "text-primary",
    buttonVariant: "whatsapp",
    radiusToken: "lg",
    shadowToken: "none",
  },
  layout: {
    contentAlignment: "space-between",
    direction: "row",
    paddingBlock: { start: "0", end: "64" },
    maxContentWidth: "lg",
    gap: "16",
  },
  visibility: {
    showIcon: true,
    iconName: "message-circle",
    hideOnMobile: false,
  },
};

export const defaultFooterSettings: FooterEditorSettings = {
  content: {
    logo: { src: "/images/logo-white.png", alt: "נווה שמיר — הפורטל של השכונה", objectFit: "contain" },
    description: "הפורטל הקהילתי של השכונה — עסקים, אירועים, חוגים וגמ״ח, הכל במקום אחד.",
    navColumnTitle: "ניווט",
    essentialColumnTitle: "מידע חיוני",
    creditText: SITE_CONFIG.designCredit,
    navItems: NAV_LINKS.map((link) => ({ id: link.id, label: link.label, href: link.href, visible: true })),
    legalLinks: FOOTER_LEGAL_LINKS,
    showLegalLinks: true,
  },
  appearance: {
    backgroundColorToken: "inverse",
    textColorToken: "text-inverse",
    linkColorToken: "muted",
    linkHoverColorToken: "text-inverse",
    borderColorToken: "navy-muted",
    textSizeToken: "sm",
    logoSizeToken: "md",
  },
  layout: {
    columnsDesktop: 3,
    columnsTablet: 2,
    gap: "32",
    paddingBlockStart: "48",
    contentAlignment: "space-between",
  },
};

export const defaultHomeEditorState: PageEditorState = {
  version: 2,
  pageId: "home",
  updatedAt: "",
  sectionsOrder: ["quickLinks", "featuredBusinesses", "upcomingEvents", "whatsappBanner"],
  hiddenSections: [],
  sections: {
    header: defaultHeaderSettings,
    hero: defaultHeroSettings,
    quickLinks: defaultQuickLinksSettings,
    featuredBusinesses: defaultFeaturedBusinessesSettings,
    upcomingEvents: defaultUpcomingEventsSettings,
    whatsappBanner: defaultWhatsAppBannerSettings,
    footer: defaultFooterSettings,
  },
};

/** Used to disable the "Reset" action when there's nothing to reset (content-only compare, ignoring updatedAt). */
export function isEditorStateAtDefaults(state: PageEditorState): boolean {
  const stateRest: Partial<PageEditorState> = { ...state, updatedAt: undefined };
  const defaultsRest: Partial<PageEditorState> = { ...defaultHomeEditorState, updatedAt: undefined };
  return JSON.stringify(stateRest) === JSON.stringify(defaultsRest);
}
