"use client";

import { WhatsAppBanner } from "@/components/home/WhatsAppBanner";
import { defaultWhatsAppBannerSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";

export function ConnectedWhatsAppBanner() {
  const settings = useResolvedSectionSettings("whatsappBanner", defaultWhatsAppBannerSettings);
  return <WhatsAppBanner settings={settings} />;
}
