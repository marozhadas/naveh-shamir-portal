import type { ComponentType } from "react";
import type { EditorPanelId, HomeRegionId } from "@/editor/types/editor.types";
import { HeroSettingsPanel } from "@/editor/components/HeroSettingsPanel/HeroSettingsPanel";
import { HeaderSettingsPanel } from "@/editor/components/HeaderSettingsPanel/HeaderSettingsPanel";
import { FooterSettingsPanel } from "@/editor/components/FooterSettingsPanel/FooterSettingsPanel";
import { QuickLinksSettingsPanel } from "@/editor/components/QuickLinksSettingsPanel/QuickLinksSettingsPanel";
import { FeaturedBusinessesSettingsPanel } from "@/editor/components/FeaturedBusinessesSettingsPanel/FeaturedBusinessesSettingsPanel";
import { UpcomingEventsSettingsPanel } from "@/editor/components/UpcomingEventsSettingsPanel/UpcomingEventsSettingsPanel";
import { WhatsAppBannerSettingsPanel } from "@/editor/components/WhatsAppBannerSettingsPanel/WhatsAppBannerSettingsPanel";

type SettingsPanelComponent = ComponentType<{ tab: EditorPanelId }>;

/** One place mapping each editable region to the panel component that renders its real controls. */
export const settingsPanelComponents: Record<HomeRegionId, SettingsPanelComponent> = {
  "home.header": HeaderSettingsPanel,
  "home.hero": HeroSettingsPanel,
  "home.quickLinks": QuickLinksSettingsPanel,
  "home.featuredBusinesses": FeaturedBusinessesSettingsPanel,
  "home.upcomingEvents": UpcomingEventsSettingsPanel,
  "home.whatsappBanner": WhatsAppBannerSettingsPanel,
  "home.footer": FooterSettingsPanel,
};
