"use client";

import { Store } from "lucide-react";
import { FeaturedBusinessesSection } from "@/components/home/FeaturedBusinessesSection";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { defaultFeaturedBusinessesSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";
import { mapBusinessToTeaserCard } from "@/utils/map-business-to-teaser-card";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import sectionStyles from "@/components/home/FeaturedBusinessesSection/FeaturedBusinessesSection.module.css";
import emptyStateStyles from "@/components/events/EventsEmptyState/EventsEmptyState.module.css";

type ConnectedFeaturedBusinessesProps = {
  /**
   * Real, approved businesses the admin explicitly marked "featured" (server-fetched in
   * page.tsx, paired with each business's public-profile access so a basic-tier pick still shows
   * without a broken link). When present, these REPLACE the editor-authored `content.cards` — the
   * admin's picks in /admin/businesses are the single source of truth here, not the floating-
   * editor blob. Appearance/layout settings still come from the editor as normal.
   */
  businesses?: { registration: BusinessRegistrationRow; canOpenProfile: boolean }[];
};

export function ConnectedFeaturedBusinesses({ businesses }: ConnectedFeaturedBusinessesProps) {
  const settings = useResolvedSectionSettings("featuredBusinesses", defaultFeaturedBusinessesSettings);

  if (businesses !== undefined) {
    // No admin-featured businesses yet — the section stays visible (an always-present homepage
    // area) with an honest empty state instead of the editor-authored placeholder/demo cards.
    if (businesses.length === 0) {
      return (
        <section id="businesses" className={sectionStyles.section} aria-labelledby="businesses-heading">
          {settings.content.sectionTitle && <SectionHeader id="businesses-heading">{settings.content.sectionTitle}</SectionHeader>}
          <div className={emptyStateStyles.wrap} role="status">
            <Store size={40} strokeWidth={1.5} aria-hidden="true" className={emptyStateStyles.icon} />
            <h3 className={emptyStateStyles.title}>אין כרגע עסקים מומלצים להצגה</h3>
            <p className={emptyStateStyles.description}>עסקים מומלצים יופיעו כאן לאחר שיסומנו על ידי הצוות.</p>
          </div>
        </section>
      );
    }

    const cards = businesses.map(({ registration, canOpenProfile }) => mapBusinessToTeaserCard(registration, canOpenProfile));
    const overriddenSettings = {
      ...settings,
      content: { ...settings.content, cards, cardsOrder: cards.map((card) => card.id) },
    };
    return <FeaturedBusinessesSection settings={overriddenSettings} />;
  }

  return <FeaturedBusinessesSection settings={settings} />;
}
