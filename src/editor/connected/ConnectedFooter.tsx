"use client";

import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";

export function ConnectedFooter() {
  const settings = useResolvedSectionSettings("footer", defaultFooterSettings);
  return <Footer settings={settings} />;
}
