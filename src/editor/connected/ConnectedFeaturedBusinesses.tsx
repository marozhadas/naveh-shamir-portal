"use client";

import { FeaturedBusinessesSection } from "@/components/home/FeaturedBusinessesSection";
import { defaultFeaturedBusinessesSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";

export function ConnectedFeaturedBusinesses() {
  const settings = useResolvedSectionSettings("featuredBusinesses", defaultFeaturedBusinessesSettings);
  return <FeaturedBusinessesSection settings={settings} />;
}
