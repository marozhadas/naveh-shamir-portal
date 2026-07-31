import type { ZodTypeAny } from "zod";
import type { EditableComponentCapabilities, EditorPanelId, HomeRegionId } from "@/editor/types/editor.types";
import { headerSettingsSchema } from "@/editor/schemas/header.schema";
import { heroSettingsSchema } from "@/editor/schemas/hero.schema";
import { quickLinksSettingsSchema } from "@/editor/schemas/quick-links.schema";
import { featuredBusinessesSettingsSchema } from "@/editor/schemas/businesses.schema";
import { upcomingEventsSettingsSchema } from "@/editor/schemas/events.schema";
import { whatsappBannerSettingsSchema } from "@/editor/schemas/whatsapp.schema";
import { footerSettingsSchema } from "@/editor/schemas/footer.schema";
import {
  defaultFeaturedBusinessesSettings,
  defaultFooterSettings,
  defaultHeaderSettings,
  defaultHeroSettings,
  defaultQuickLinksSettings,
  defaultUpcomingEventsSettings,
  defaultWhatsAppBannerSettings,
} from "@/editor/config/editor-defaults";

export type EditableComponentEntry = {
  label: string;
  type: string;
  schema: ZodTypeAny;
  defaultSettings: unknown;
  panels: EditorPanelId[];
  /** Can this region be reordered among the movable homepage sections? */
  movable: boolean;
  /** Can this region ever be hidden entirely? Header/Hero/Footer are structural — always false. */
  removable: boolean;
  capabilities: EditableComponentCapabilities;
};

const STRUCTURAL_CAPABILITIES: EditableComponentCapabilities = {
  editContent: true,
  editDesign: true,
  editLayout: true,
  editResponsive: false,
  editItems: true,
  reorderItems: false,
  hideSection: false,
  resetSection: true,
};

const MOVABLE_WITH_ITEMS_CAPABILITIES: EditableComponentCapabilities = {
  editContent: true,
  editDesign: true,
  editLayout: true,
  editResponsive: false,
  editItems: true,
  reorderItems: true,
  hideSection: true,
  resetSection: true,
};

export const editableComponentsRegistry: Record<HomeRegionId, EditableComponentEntry> = {
  "home.header": {
    label: "כותרת עליונה",
    type: "header",
    schema: headerSettingsSchema,
    defaultSettings: defaultHeaderSettings,
    panels: ["content", "design", "layout"],
    movable: false,
    removable: false,
    capabilities: { ...STRUCTURAL_CAPABILITIES, reorderItems: true },
  },
  "home.hero": {
    label: "אזור ראשי",
    type: "hero",
    schema: heroSettingsSchema,
    defaultSettings: defaultHeroSettings,
    panels: ["content", "design", "layout", "responsive"],
    movable: false,
    removable: false,
    capabilities: { ...STRUCTURAL_CAPABILITIES, editResponsive: true, editItems: false },
  },
  "home.quickLinks": {
    label: "קישורים מהירים",
    type: "quickLinks",
    schema: quickLinksSettingsSchema,
    defaultSettings: defaultQuickLinksSettings,
    panels: ["content", "design", "layout"],
    movable: true,
    removable: false,
    capabilities: MOVABLE_WITH_ITEMS_CAPABILITIES,
  },
  "home.featuredBusinesses": {
    label: "עסקים מומלצים",
    type: "featuredBusinesses",
    schema: featuredBusinessesSettingsSchema,
    defaultSettings: defaultFeaturedBusinessesSettings,
    panels: ["content", "design", "layout"],
    movable: true,
    removable: false,
    capabilities: MOVABLE_WITH_ITEMS_CAPABILITIES,
  },
  "home.upcomingEvents": {
    label: "אירועים קרובים",
    type: "upcomingEvents",
    schema: upcomingEventsSettingsSchema,
    defaultSettings: defaultUpcomingEventsSettings,
    panels: ["content", "design", "layout"],
    movable: true,
    removable: false,
    capabilities: MOVABLE_WITH_ITEMS_CAPABILITIES,
  },
  "home.whatsappBanner": {
    label: "באנר וואטסאפ",
    type: "whatsappBanner",
    schema: whatsappBannerSettingsSchema,
    defaultSettings: defaultWhatsAppBannerSettings,
    panels: ["content", "design", "layout"],
    movable: true,
    removable: false,
    capabilities: { ...MOVABLE_WITH_ITEMS_CAPABILITIES, editItems: false, reorderItems: false },
  },
  "home.footer": {
    label: "פוטר",
    type: "footer",
    schema: footerSettingsSchema,
    defaultSettings: defaultFooterSettings,
    panels: ["content", "design", "layout"],
    movable: false,
    removable: false,
    capabilities: { ...STRUCTURAL_CAPABILITIES, reorderItems: true },
  },
};

export function getEditableComponentEntry(regionId: HomeRegionId): EditableComponentEntry {
  return editableComponentsRegistry[regionId];
}
