import { describe, expect, it } from "vitest";
import { createInitialEditorState, editorReducer } from "./editor-reducer";
import { defaultHomeEditorState } from "@/editor/config/editor-defaults";
import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

function freshState() {
  return createInitialEditorState(structuredClone(defaultHomeEditorState));
}

describe("editorReducer", () => {
  it("SET_SECTION_SETTINGS updates the section and marks the state dirty", () => {
    const state = freshState();
    const nextHero: PageEditorState["sections"]["hero"] = {
      ...state.currentState.sections.hero,
      content: { ...state.currentState.sections.hero.content, title: "כותרת חדשה" },
    };
    const next = editorReducer(state, { type: "SET_SECTION_SETTINGS", section: "hero", settings: nextHero });
    expect(next.currentState.sections.hero.content.title).toBe("כותרת חדשה");
    expect(next.savingStatus).toBe("dirty");
  });

  it("UNDO restores the pre-change snapshot committed via COMMIT_HISTORY_SNAPSHOT, and REDO restores the change", () => {
    const state = freshState();
    const baseline = state.currentState;
    const nextHero: PageEditorState["sections"]["hero"] = {
      ...state.currentState.sections.hero,
      content: { ...state.currentState.sections.hero.content, title: "כותרת חדשה" },
    };

    let next = editorReducer(state, { type: "SET_SECTION_SETTINGS", section: "hero", settings: nextHero });
    next = editorReducer(next, { type: "COMMIT_HISTORY_SNAPSHOT", snapshot: baseline });
    expect(next.currentState.sections.hero.content.title).toBe("כותרת חדשה");
    expect(next.history).toHaveLength(1);

    const afterUndo = editorReducer(next, { type: "UNDO" });
    expect(afterUndo.currentState.sections.hero.content.title).toBe(defaultHomeEditorState.sections.hero.content.title);
    expect(afterUndo.history).toHaveLength(0);
    expect(afterUndo.future).toHaveLength(1);

    const afterRedo = editorReducer(afterUndo, { type: "REDO" });
    expect(afterRedo.currentState.sections.hero.content.title).toBe("כותרת חדשה");
    expect(afterRedo.future).toHaveLength(0);
  });

  it("UNDO with an empty history is a no-op", () => {
    const state = freshState();
    const next = editorReducer(state, { type: "UNDO" });
    expect(next).toBe(state);
  });

  it("RESET_SECTION restores one section's defaults and is itself undoable", () => {
    const state = freshState();
    const editedHero: PageEditorState["sections"]["hero"] = {
      ...state.currentState.sections.hero,
      content: { ...state.currentState.sections.hero.content, title: "כותרת ערוכה" },
    };
    let next = editorReducer(state, { type: "SET_SECTION_SETTINGS", section: "hero", settings: editedHero });
    next = editorReducer(next, { type: "COMMIT_HISTORY_SNAPSHOT", snapshot: state.currentState });

    const resetNext = editorReducer(next, {
      type: "RESET_SECTION",
      section: "hero",
      defaultSettings: defaultHomeEditorState.sections.hero,
    });
    expect(resetNext.currentState.sections.hero.content.title).toBe(defaultHomeEditorState.sections.hero.content.title);
    expect(resetNext.history.length).toBe(next.history.length + 1);

    const undone = editorReducer(resetNext, { type: "UNDO" });
    expect(undone.currentState.sections.hero.content.title).toBe("כותרת ערוכה");
  });

  it("REORDER_SECTIONS changes sectionsOrder without touching hiddenSections", () => {
    const state = freshState();
    const newOrder: PageEditorState["sectionsOrder"] = ["whatsappBanner", "quickLinks", "featuredBusinesses", "upcomingEvents"];
    const next = editorReducer(state, { type: "REORDER_SECTIONS", order: newOrder });
    expect(next.currentState.sectionsOrder).toEqual(newOrder);
    expect(next.currentState.hiddenSections).toEqual(state.currentState.hiddenSections);
  });

  it("SET_HIDDEN_SECTIONS changes hiddenSections without touching sectionsOrder", () => {
    const state = freshState();
    const next = editorReducer(state, { type: "SET_HIDDEN_SECTIONS", hiddenSections: ["whatsappBanner"] });
    expect(next.currentState.hiddenSections).toEqual(["whatsappBanner"]);
    expect(next.currentState.sectionsOrder).toEqual(state.currentState.sectionsOrder);
  });

  it("RESET_ALL restores the full default state and is undoable", () => {
    const state = freshState();
    const edited = editorReducer(state, {
      type: "SET_SECTION_SETTINGS",
      section: "hero",
      settings: { ...state.currentState.sections.hero, content: { ...state.currentState.sections.hero.content, title: "שונה" } },
    });

    const resetState: PageEditorState = { ...structuredClone(defaultHomeEditorState), updatedAt: "2026-01-01T00:00:00.000Z" };
    const afterReset = editorReducer(edited, { type: "RESET_ALL", defaultState: resetState });
    expect(afterReset.currentState.sections.hero.content.title).toBe(defaultHomeEditorState.sections.hero.content.title);
    expect(afterReset.history.length).toBe(1);

    const undone = editorReducer(afterReset, { type: "UNDO" });
    expect(undone.currentState.sections.hero.content.title).toBe("שונה");
  });
});
