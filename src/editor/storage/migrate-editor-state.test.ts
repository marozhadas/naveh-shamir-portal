import { describe, expect, it } from "vitest";
import { migrateEditorStateIfNeeded } from "./migrate-editor-state";
import { defaultHomeEditorState } from "@/editor/config/editor-defaults";

const V1_STATE = {
  version: 1,
  pageId: "home",
  updatedAt: "2026-01-01T00:00:00.000Z",
  sectionsOrder: ["whatsappBanner", "quickLinks", "featuredBusinesses", "upcomingEvents"],
  sections: {
    header: {
      content: { logo: { src: "/images/logo-color.png", alt: "לוגו מותאם אישית", objectFit: "contain" }, ctaLabel: "טקסט מותאם", showPersonalAreaButton: false },
      appearance: { backgroundColorToken: "navy", textColorToken: "text-inverse", ctaVariant: "accent", headerShadow: "sm", sticky: false },
      layout: { containerMaxWidth: "xl", navItemGap: "32", showDesktopNav: true },
    },
    hero: {
      ...defaultHomeEditorState.sections.hero,
      content: { ...defaultHomeEditorState.sections.hero.content, title: "כותרת שהמשתמש ערך" },
    },
    quickLinks: defaultHomeEditorState.sections.quickLinks,
    featuredBusinesses: defaultHomeEditorState.sections.featuredBusinesses,
    upcomingEvents: defaultHomeEditorState.sections.upcomingEvents,
    whatsappBanner: defaultHomeEditorState.sections.whatsappBanner,
    footer: defaultHomeEditorState.sections.footer,
  },
};

describe("migrateEditorStateIfNeeded", () => {
  it("leaves already-v2 data untouched", () => {
    const result = migrateEditorStateIfNeeded(defaultHomeEditorState, defaultHomeEditorState);
    expect(result).toBe(defaultHomeEditorState);
  });

  it("leaves non-object / unrecognized-shape input untouched (caller's schema validation handles it)", () => {
    expect(migrateEditorStateIfNeeded(null, defaultHomeEditorState)).toBeNull();
    expect(migrateEditorStateIfNeeded("garbage", defaultHomeEditorState)).toBe("garbage");
    expect(migrateEditorStateIfNeeded({ version: 999 }, defaultHomeEditorState)).toEqual({ version: 999 });
  });

  it("bumps version to 2 and adds hiddenSections: []", () => {
    const migrated = migrateEditorStateIfNeeded(V1_STATE, defaultHomeEditorState) as Record<string, unknown>;
    expect(migrated.version).toBe(2);
    expect(migrated.hiddenSections).toEqual([]);
  });

  it("preserves the existing section order", () => {
    const migrated = migrateEditorStateIfNeeded(V1_STATE, defaultHomeEditorState) as Record<string, unknown>;
    expect(migrated.sectionsOrder).toEqual(V1_STATE.sectionsOrder);
  });

  it("preserves existing Hero content the user already edited", () => {
    const migrated = migrateEditorStateIfNeeded(V1_STATE, defaultHomeEditorState) as {
      sections: { hero: { content: { title: string } } };
    };
    expect(migrated.sections.hero.content.title).toBe("כותרת שהמשתמש ערך");
  });

  it("preserves existing header fields that still exist in v2 and fills in genuinely new ones from defaults", () => {
    const migrated = migrateEditorStateIfNeeded(V1_STATE, defaultHomeEditorState) as {
      sections: {
        header: {
          content: { ctaLabel: string; showPersonalAreaButton: boolean; navItems: unknown[] };
          appearance: { backgroundColorToken: string };
        };
      };
    };
    expect(migrated.sections.header.content.ctaLabel).toBe("טקסט מותאם");
    expect(migrated.sections.header.content.showPersonalAreaButton).toBe(false);
    expect(migrated.sections.header.appearance.backgroundColorToken).toBe("navy");
    // navItems never existed in v1 header settings — must fall back to the current default.
    expect(migrated.sections.header.content.navItems).toEqual(defaultHomeEditorState.sections.header.content.navItems);
  });

  it("never mutates the original v1 input or the defaults object", () => {
    const v1Copy = JSON.parse(JSON.stringify(V1_STATE));
    const defaultsCopy = JSON.parse(JSON.stringify(defaultHomeEditorState));
    migrateEditorStateIfNeeded(V1_STATE, defaultHomeEditorState);
    expect(V1_STATE).toEqual(v1Copy);
    expect(defaultHomeEditorState).toEqual(defaultsCopy);
  });
});
