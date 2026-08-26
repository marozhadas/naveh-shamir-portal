"use client";

import type { ComponentType } from "react";
import { useOptionalEditorState } from "@/editor/context/EditorContext";
import { usePublishedContent } from "@/editor/context/PublishedContentContext";
import { EditableRegion } from "@/editor/components/EditableRegion/EditableRegion";
import { MOVABLE_SECTION_IDS } from "@/editor/schemas/page-editor.schema";
import type { HomeRegionId, HomeSectionId } from "@/editor/types/editor.types";
import type { CommunityEventRow } from "@/types/community-event";
import type { CommunityNewsRow } from "@/types/community-news";
import type { BusinessRegistrationRow } from "@/types/business-registration";
import { ConnectedQuickLinks } from "./ConnectedQuickLinks";
import { ConnectedFeaturedBusinesses } from "./ConnectedFeaturedBusinesses";
import { ConnectedUpcomingEvents } from "./ConnectedUpcomingEvents";
import { ConnectedWhatsAppBanner } from "./ConnectedWhatsAppBanner";
import styles from "./ConnectedMovableSections.module.css";

const SECTION_MAP: Record<HomeSectionId, { Component: ComponentType; regionId: HomeRegionId; label: string }> = {
  quickLinks: { Component: ConnectedQuickLinks, regionId: "home.quickLinks", label: "קישורים מהירים" },
  featuredBusinesses: { Component: ConnectedFeaturedBusinesses, regionId: "home.featuredBusinesses", label: "עסקים מומלצים" },
  upcomingEvents: { Component: ConnectedUpcomingEvents, regionId: "home.upcomingEvents", label: "אירועים קרובים" },
  whatsappBanner: { Component: ConnectedWhatsAppBanner, regionId: "home.whatsappBanner", label: "באנר וואטסאפ" },
};

type ConnectedMovableSectionsProps = {
  /** Server-fetched real upcoming events (page.tsx) — special-cased through to ConnectedUpcomingEvents only; SECTION_MAP's other components take no props. */
  upcomingEvents?: CommunityEventRow[];
  /** Server-fetched real published community-news articles (page.tsx), newest first — special-cased through to ConnectedUpcomingEvents alongside upcomingEvents (that section now shows both). */
  communityNews?: CommunityNewsRow[];
  /** Server-fetched real admin-featured businesses (page.tsx), paired with each one's public-profile access — special-cased through to ConnectedFeaturedBusinesses only. */
  featuredBusinesses?: { registration: BusinessRegistrationRow; canOpenProfile: boolean }[];
};

/**
 * Renders the four reorderable/hideable homepage sections in the author's chosen order.
 * Header/Hero/Footer are structural and never pass through here (spec: they can't move or hide).
 * Order/hidden-state resolve the same way useResolvedSectionSettings() does: the live in-progress
 * editor draft when it's mounted, otherwise the real published content, otherwise (nothing ever
 * published) the built-in default order with nothing hidden.
 */
export function ConnectedMovableSections({ upcomingEvents, communityNews, featuredBusinesses }: ConnectedMovableSectionsProps) {
  const state = useOptionalEditorState();
  const published = usePublishedContent();
  const order = state?.currentState.sectionsOrder ?? published?.sectionsOrder ?? MOVABLE_SECTION_IDS;
  const hiddenSet = new Set(state?.currentState.hiddenSections ?? published?.hiddenSections ?? []);
  const isAuthoringView = Boolean(state?.editorOpen && !state.previewMode);

  return (
    <>
      {order.map((sectionId) => {
        const entry = SECTION_MAP[sectionId];
        const isHidden = hiddenSet.has(sectionId);
        if (isHidden && !isAuthoringView) return null;

        const { Component } = entry;
        const element =
          sectionId === "upcomingEvents" ? (
            <ConnectedUpcomingEvents events={upcomingEvents} news={communityNews} />
          ) : sectionId === "featuredBusinesses" ? (
            <ConnectedFeaturedBusinesses businesses={featuredBusinesses} />
          ) : (
            <Component />
          );
        return (
          <EditableRegion key={sectionId} id={entry.regionId} label={entry.label}>
            {isHidden ? (
              <div className={styles.hiddenPreview}>
                <span className={styles.hiddenBadge}>מוסתר באתר החי</span>
                {element}
              </div>
            ) : (
              element
            )}
          </EditableRegion>
        );
      })}
    </>
  );
}
