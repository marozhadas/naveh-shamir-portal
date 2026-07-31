import { describe, expect, it } from "vitest";
import { pageEditorStateSchema } from "./page-editor.schema";
import { defaultHomeEditorState } from "@/editor/config/editor-defaults";

describe("pageEditorStateSchema", () => {
  it("accepts the shipped defaults", () => {
    const result = pageEditorStateSchema.safeParse(defaultHomeEditorState);
    expect(result.success).toBe(true);
  });

  it("rejects an unrecognized version", () => {
    const result = pageEditorStateSchema.safeParse({ ...defaultHomeEditorState, version: 3 });
    expect(result.success).toBe(false);
  });

  it("rejects a sectionsOrder with a duplicate entry", () => {
    const result = pageEditorStateSchema.safeParse({
      ...defaultHomeEditorState,
      sectionsOrder: ["quickLinks", "quickLinks", "upcomingEvents", "whatsappBanner"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a sectionsOrder missing one of the four movable sections", () => {
    const result = pageEditorStateSchema.safeParse({
      ...defaultHomeEditorState,
      sectionsOrder: ["quickLinks", "featuredBusinesses", "upcomingEvents"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate ids inside hiddenSections", () => {
    const result = pageEditorStateSchema.safeParse({
      ...defaultHomeEditorState,
      hiddenSections: ["quickLinks", "quickLinks"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts hiddenSections containing every movable section (Header/Hero/Footer aren't part of this list at all)", () => {
    const result = pageEditorStateSchema.safeParse({
      ...defaultHomeEditorState,
      hiddenSections: ["quickLinks", "featuredBusinesses", "upcomingEvents", "whatsappBanner"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects turning off footer.content.showLegalLinks", () => {
    const result = pageEditorStateSchema.safeParse({
      ...defaultHomeEditorState,
      sections: {
        ...defaultHomeEditorState.sections,
        footer: {
          ...defaultHomeEditorState.sections.footer,
          content: { ...defaultHomeEditorState.sections.footer.content, showLegalLinks: false },
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
