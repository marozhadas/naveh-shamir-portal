"use client";

import { useEditor } from "@/editor/hooks/use-editor";
import { useSectionSettings } from "@/editor/state/editor-selectors";
import { TextField, TextAreaField, ToggleField } from "@/editor/components/EditorField/EditorField";
import { HeroGalleryManager } from "@/editor/components/HeroGalleryManager/HeroGalleryManager";
import { TokenPicker } from "@/editor/components/TokenPicker/TokenPicker";
import { TokenSelect } from "@/editor/components/TokenPicker/TokenSelect";
import { SegmentedControl } from "@/editor/components/TokenPicker/SegmentedControl";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import {
  FONT_SIZE_TOKEN_LABEL,
  FONT_WEIGHT_TOKEN_LABEL,
  HERO_MAX_CONTENT_WIDTH_LABEL,
  RADIUS_TOKEN_LABEL,
  SHADOW_TOKEN_LABEL,
  SPACING_TOKEN_LABEL,
} from "@/editor/config/editor-constants";
import type {
  ColorToken,
  FontSizeToken,
  FontWeightToken,
  RadiusToken,
  ShadowToken,
  SpacingToken,
  TextAlignToken,
  EditorPanelId,
} from "@/editor/types/editor.types";
import type { HeroEditorSettings } from "@/editor/schemas/hero.schema";

const COLOR_OPTIONS: ColorToken[] = [
  "navy",
  "inverse",
  "surface",
  "background",
  "yellow",
  "green",
  "text-primary",
  "text-secondary",
  "text-inverse",
  "muted",
];

const FONT_SIZE_OPTIONS: FontSizeToken[] = ["xs", "sm", "base", "lg", "xl", "2xl", "display", "3xl", "4xl"];
const FONT_WEIGHT_OPTIONS: FontWeightToken[] = ["light", "regular", "medium", "demibold", "bold", "ultrabold", "black"];
const SPACING_OPTIONS: SpacingToken[] = ["0", "4", "8", "12", "16", "20", "24", "32", "40", "48", "64", "80", "96"];
const RADIUS_OPTIONS: RadiusToken[] = ["sm", "md", "lg", "pill"];
const SHADOW_OPTIONS: ShadowToken[] = ["none", "sm", "card", "card-hover", "modal"];
const ALIGN_OPTIONS: TextAlignToken[] = ["start", "center"];
const ALIGN_LABELS: Record<TextAlignToken, string> = { start: "התחלה", center: "מרכז" };
const MAX_WIDTH_OPTIONS: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];

type HeroSettingsPanelProps = {
  tab: EditorPanelId;
};

export function HeroSettingsPanel({ tab }: HeroSettingsPanelProps) {
  const hero = useSectionSettings("hero");
  const { updateSection } = useEditor();

  function onTextChange(field: keyof HeroEditorSettings["content"], value: string) {
    updateSection("hero", { ...hero, content: { ...hero.content, [field]: value } }, "debounced");
  }

  function onDiscreteChange(next: HeroEditorSettings) {
    updateSection("hero", next);
  }

  if (tab === "content") {
    return (
      <>
        <HeroGalleryManager />
        <TextField
          label="כותרת ראשית"
          value={hero.content.title}
          maxLength={CONTENT_LIMITS.heroTitle}
          required
          onChange={(value) => onTextChange("title", value)}
        />
        <TextAreaField
          label="תיאור"
          value={hero.content.description}
          maxLength={CONTENT_LIMITS.heroDescription}
          onChange={(value) => onTextChange("description", value)}
        />
        <TextField
          label="Placeholder לחיפוש"
          value={hero.content.searchPlaceholder}
          maxLength={CONTENT_LIMITS.searchPlaceholder}
          onChange={(value) => onTextChange("searchPlaceholder", value)}
        />
      </>
    );
  }

  if (tab === "design") {
    return (
      <>
        <TokenPicker
          label="צבע רקע"
          value={hero.appearance.backgroundColorToken}
          options={COLOR_OPTIONS}
          onChange={(value) => onDiscreteChange({ ...hero, appearance: { ...hero.appearance, backgroundColorToken: value } })}
        />
        <TokenPicker
          label="צבע כותרת"
          value={hero.appearance.titleColorToken}
          options={COLOR_OPTIONS}
          onChange={(value) => onDiscreteChange({ ...hero, appearance: { ...hero.appearance, titleColorToken: value } })}
        />
        <TokenPicker
          label="צבע תיאור"
          value={hero.appearance.descriptionColorToken}
          options={COLOR_OPTIONS}
          onChange={(value) =>
            onDiscreteChange({ ...hero, appearance: { ...hero.appearance, descriptionColorToken: value } })
          }
        />
        <TokenSelect
          label="גודל כותרת"
          value={hero.appearance.titleSizeToken}
          options={FONT_SIZE_OPTIONS}
          labels={FONT_SIZE_TOKEN_LABEL}
          onChange={(value) => onDiscreteChange({ ...hero, appearance: { ...hero.appearance, titleSizeToken: value } })}
        />
        <TokenSelect
          label="משקל כותרת"
          value={hero.appearance.titleWeightToken}
          options={FONT_WEIGHT_OPTIONS}
          labels={FONT_WEIGHT_TOKEN_LABEL}
          onChange={(value) => onDiscreteChange({ ...hero, appearance: { ...hero.appearance, titleWeightToken: value } })}
        />
        <TokenSelect
          label="גודל תיאור"
          value={hero.appearance.descriptionSizeToken}
          options={FONT_SIZE_OPTIONS}
          labels={FONT_SIZE_TOKEN_LABEL}
          onChange={(value) =>
            onDiscreteChange({ ...hero, appearance: { ...hero.appearance, descriptionSizeToken: value } })
          }
        />
        <SegmentedControl
          label="יישור תוכן"
          value={hero.appearance.contentAlignment}
          options={ALIGN_OPTIONS}
          labels={ALIGN_LABELS}
          onChange={(value) => onDiscreteChange({ ...hero, appearance: { ...hero.appearance, contentAlignment: value } })}
        />
        <TokenSelect
          label="עיגול פינות שורת החיפוש"
          value={hero.appearance.searchBarRadiusToken}
          options={RADIUS_OPTIONS}
          labels={RADIUS_TOKEN_LABEL}
          onChange={(value) =>
            onDiscreteChange({ ...hero, appearance: { ...hero.appearance, searchBarRadiusToken: value } })
          }
        />
        <TokenSelect
          label="צל שורת החיפוש"
          value={hero.appearance.searchBarShadowToken}
          options={SHADOW_OPTIONS}
          labels={SHADOW_TOKEN_LABEL}
          onChange={(value) =>
            onDiscreteChange({ ...hero, appearance: { ...hero.appearance, searchBarShadowToken: value } })
          }
        />
      </>
    );
  }

  if (tab === "layout") {
    return (
      <>
        <TokenSelect
          label="רוחב מקסימלי לתוכן"
          value={hero.layout.maxContentWidth}
          options={MAX_WIDTH_OPTIONS}
          labels={HERO_MAX_CONTENT_WIDTH_LABEL}
          onChange={(value) => onDiscreteChange({ ...hero, layout: { ...hero.layout, maxContentWidth: value } })}
        />
        <TokenSelect
          label="Padding עליון (Desktop)"
          value={hero.layout.paddingBlockDesktop.start}
          options={SPACING_OPTIONS}
          labels={SPACING_TOKEN_LABEL}
          onChange={(value) =>
            onDiscreteChange({
              ...hero,
              layout: { ...hero.layout, paddingBlockDesktop: { ...hero.layout.paddingBlockDesktop, start: value } },
            })
          }
        />
        <TokenSelect
          label="Padding תחתון (Desktop)"
          value={hero.layout.paddingBlockDesktop.end}
          options={SPACING_OPTIONS}
          labels={SPACING_TOKEN_LABEL}
          onChange={(value) =>
            onDiscreteChange({
              ...hero,
              layout: { ...hero.layout, paddingBlockDesktop: { ...hero.layout.paddingBlockDesktop, end: value } },
            })
          }
        />
        <TokenSelect
          label="מרווח בין כותרת לתיאור"
          value={hero.layout.titleToDescriptionGap}
          options={SPACING_OPTIONS}
          labels={SPACING_TOKEN_LABEL}
          onChange={(value) =>
            onDiscreteChange({ ...hero, layout: { ...hero.layout, titleToDescriptionGap: value } })
          }
        />
        <TokenSelect
          label="מרווח בין תיאור לחיפוש"
          value={hero.layout.descriptionToSearchGap}
          options={SPACING_OPTIONS}
          labels={SPACING_TOKEN_LABEL}
          onChange={(value) =>
            onDiscreteChange({ ...hero, layout: { ...hero.layout, descriptionToSearchGap: value } })
          }
        />
        <ToggleField
          label="הצגת שורת החיפוש"
          checked={hero.visibility.showSearch}
          onChange={(checked) => onDiscreteChange({ ...hero, visibility: { ...hero.visibility, showSearch: checked } })}
        />
      </>
    );
  }

  // responsive
  return (
    <>
      <TokenSelect
        label="גודל כותרת (מובייל)"
        value={hero.responsive.titleSizeMobileToken}
        options={FONT_SIZE_OPTIONS}
        labels={FONT_SIZE_TOKEN_LABEL}
        onChange={(value) =>
          onDiscreteChange({ ...hero, responsive: { ...hero.responsive, titleSizeMobileToken: value } })
        }
      />
      <TokenSelect
        label="Padding עליון (מובייל)"
        value={hero.responsive.paddingBlockMobile.start}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(value) =>
          onDiscreteChange({
            ...hero,
            responsive: { ...hero.responsive, paddingBlockMobile: { ...hero.responsive.paddingBlockMobile, start: value } },
          })
        }
      />
      <TokenSelect
        label="Padding תחתון (מובייל)"
        value={hero.responsive.paddingBlockMobile.end}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(value) =>
          onDiscreteChange({
            ...hero,
            responsive: { ...hero.responsive, paddingBlockMobile: { ...hero.responsive.paddingBlockMobile, end: value } },
          })
        }
      />
      <SegmentedControl
        label="יישור תוכן (מובייל)"
        value={hero.responsive.contentAlignmentMobile}
        options={ALIGN_OPTIONS}
        labels={ALIGN_LABELS}
        onChange={(value) =>
          onDiscreteChange({ ...hero, responsive: { ...hero.responsive, contentAlignmentMobile: value } })
        }
      />
    </>
  );
}
