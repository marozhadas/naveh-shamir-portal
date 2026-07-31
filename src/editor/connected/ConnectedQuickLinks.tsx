"use client";

import { QuickLinksSection } from "@/components/home/QuickLinksSection";
import { defaultQuickLinksSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";

export function ConnectedQuickLinks() {
  const settings = useResolvedSectionSettings("quickLinks", defaultQuickLinksSettings);
  return <QuickLinksSection settings={settings} />;
}
