import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

export type HomeRegionId =
  | "home.header"
  | "home.hero"
  | "home.quickLinks"
  | "home.featuredBusinesses"
  | "home.upcomingEvents"
  | "home.whatsappBanner"
  | "home.footer";

export type HomeSectionId = "quickLinks" | "featuredBusinesses" | "upcomingEvents" | "whatsappBanner";

export type EditorPanelId = "content" | "design" | "layout" | "responsive" | "advanced";

export type ViewportMode = "desktop" | "tablet" | "mobile";

export type SavingStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/** Bounded palette — every value maps to a real CSS custom property in src/styles/tokens.css. */
export type ColorToken =
  | "navy"
  | "yellow"
  | "green"
  | "orange"
  | "cyan"
  | "whatsapp"
  | "surface"
  | "background"
  | "inverse"
  | "navy-muted"
  | "highlight"
  | "success"
  | "text-primary"
  | "text-secondary"
  | "text-inverse"
  | "text-on-accent"
  | "muted"
  | "border";

/** Maps to the project's 4px spacing scale (src/styles/tokens.css --space-*). */
export type SpacingToken = "0" | "4" | "8" | "12" | "16" | "20" | "24" | "32" | "40" | "48" | "64" | "80" | "96";

export type RadiusToken = "sm" | "md" | "lg" | "pill";

export type ShadowToken = "none" | "sm" | "card" | "card-hover" | "modal";

/** Maps to the project's type scale (src/styles/tokens.css --fs-*). */
export type FontSizeToken = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "display";

export type FontWeightToken = "light" | "regular" | "medium" | "demibold" | "bold" | "black";

export type TextAlignToken = "start" | "center";

export type ButtonVariantToken = "primary" | "secondary" | "accent" | "whatsapp";

export type ContainerWidthToken = "md" | "lg" | "xl";

/** Curated icon names — a subset of lucide-react actually shipped in this project. */
export type IconToken =
  | "phone"
  | "calendar-days"
  | "hand-heart"
  | "store"
  | "message-circle"
  | "clipboard-list"
  | "map-pin"
  | "users"
  | "home"
  | "heart"
  | "book-open"
  | "gift";

export type EditableImage = {
  src: string;
  alt: string;
  objectFit: "cover" | "contain";
};

export const HISTORY_LIMIT = 30;

/**
 * Runtime editor state (kept separate from PageEditorState, which is only the
 * persisted settings document). This never itself gets written to storage.
 */
export type EditorRuntimeState = {
  isLoaded: boolean;
  editorOpen: boolean;
  previewMode: boolean;
  viewportMode: ViewportMode;
  selectedRegionId: HomeRegionId | null;
  hoveredRegionId: HomeRegionId | null;
  currentState: PageEditorState;
  persistedState: PageEditorState;
  history: PageEditorState[];
  future: PageEditorState[];
  savingStatus: SavingStatus;
  validationErrors: Record<string, string[]>;
  /**
   * A fresh object literal each time (never mutated/reused), so consumers can
   * detect "a new event just happened" via reference inequality even when two
   * events in a row share the same `kind` — used to pick toast copy.
   */
  lastEvent: EditorEvent | null;
};

export type EditorEvent = { kind: "saved" | "reset" | "load-error" | "save-error"; message?: string };

/** Declares what a region's editor actually supports — read by the panel to decide which controls/actions to render. */
export type EditableComponentCapabilities = {
  editContent: boolean;
  editDesign: boolean;
  editLayout: boolean;
  editResponsive: boolean;
  editItems: boolean;
  reorderItems: boolean;
  hideSection: boolean;
  resetSection: boolean;
};
