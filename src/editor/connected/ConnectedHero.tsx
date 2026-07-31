"use client";

import { HeroSection } from "@/components/home/HeroSection";
import { DEFAULT_HERO_SETTINGS } from "@/data/hero-content";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";

/**
 * Bridges editor state to the pure HeroSection component. HeroSection itself
 * only ever receives a plain `settings` prop — it has no idea this connector,
 * or the editor, exists.
 */
export function ConnectedHero() {
  const settings = useResolvedSectionSettings("hero", DEFAULT_HERO_SETTINGS);
  return <HeroSection settings={settings} />;
}
