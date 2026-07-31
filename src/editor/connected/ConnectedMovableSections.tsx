"use client";

import type { ComponentType } from "react";
import { useOptionalEditorState } from "@/editor/context/EditorContext";
import { EditableRegion } from "@/editor/components/EditableRegion/EditableRegion";
import { MOVABLE_SECTION_IDS } from "@/editor/schemas/page-editor.schema";
import type { HomeRegionId, HomeSectionId } from "@/editor/types/editor.types";
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

/**
 * Renders the four reorderable/hideable homepage sections in the author's chosen order.
 * Header/Hero/Footer are structural and never pass through here (spec: they can't move or hide).
 * With no EditorProvider mounted (the normal case for every visitor) this reads as the default
 * order with nothing hidden — identical to how the page rendered before Phase C.
 */
export function ConnectedMovableSections() {
  const state = useOptionalEditorState();
  const order = state?.currentState.sectionsOrder ?? MOVABLE_SECTION_IDS;
  const hiddenSet = new Set(state?.currentState.hiddenSections ?? []);
  const isAuthoringView = Boolean(state?.editorOpen && !state.previewMode);

  return (
    <>
      {order.map((sectionId) => {
        const entry = SECTION_MAP[sectionId];
        const isHidden = hiddenSet.has(sectionId);
        if (isHidden && !isAuthoringView) return null;

        const { Component } = entry;
        return (
          <EditableRegion key={sectionId} id={entry.regionId} label={entry.label}>
            {isHidden ? (
              <div className={styles.hiddenPreview}>
                <span className={styles.hiddenBadge}>מוסתר באתר החי</span>
                <Component />
              </div>
            ) : (
              <Component />
            )}
          </EditableRegion>
        );
      })}
    </>
  );
}
