"use client";

import { useEditor } from "@/editor/hooks/use-editor";
import { useSectionSettings } from "@/editor/state/editor-selectors";
import { TextField, TextAreaField, ToggleField } from "@/editor/components/EditorField/EditorField";
import { TokenPicker } from "@/editor/components/TokenPicker/TokenPicker";
import { TokenSelect } from "@/editor/components/TokenPicker/TokenSelect";
import { SegmentedControl } from "@/editor/components/TokenPicker/SegmentedControl";
import { LinkControl } from "@/editor/components/LinkControl/LinkControl";
import { ContrastWarning } from "@/editor/components/ContrastWarning/ContrastWarning";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import { SHADOW_TOKEN_LABEL, SPACING_TOKEN_LABEL } from "@/editor/config/editor-constants";
import { ICON_TOKEN_LABEL } from "@/styles/icon-token-map";
import type { ButtonVariant } from "@/components/ui/Button";
import type { ColorToken, EditorPanelId, IconToken, ShadowToken, SpacingToken } from "@/editor/types/editor.types";
import type { WhatsAppBannerEditorSettings } from "@/editor/schemas/whatsapp.schema";

const COLOR_OPTIONS: ColorToken[] = ["success", "highlight", "surface", "background", "text-primary"];
const SPACING_OPTIONS: SpacingToken[] = ["0", "8", "16", "24", "32", "48", "64"];
const RADIUS_OPTIONS: Array<"sm" | "md" | "lg" | "xl" | "pill"> = ["sm", "md", "lg", "xl", "pill"];
const RADIUS_LABEL: Record<"sm" | "md" | "lg" | "xl" | "pill", string> = {
  sm: "קטן",
  md: "בינוני",
  lg: "גדול",
  xl: "גדול מאוד",
  pill: "עגול",
};
const SHADOW_OPTIONS: ShadowToken[] = ["none", "sm", "card", "card-hover", "modal"];
const BUTTON_VARIANT_OPTIONS: ButtonVariant[] = ["whatsapp", "primary", "secondary", "accent"];
const BUTTON_VARIANT_LABEL: Record<ButtonVariant, string> = { primary: "ראשי", secondary: "משני", accent: "הדגשה", whatsapp: "וואטסאפ" };
const ALIGN_OPTIONS: Array<"start" | "center" | "space-between"> = ["start", "center", "space-between"];
const ALIGN_LABEL: Record<"start" | "center" | "space-between", string> = { start: "התחלה", center: "מרכז", "space-between": "מרווח שווה" };
const DIRECTION_OPTIONS: Array<"row" | "column"> = ["row", "column"];
const DIRECTION_LABEL: Record<"row" | "column", string> = { row: "שורה", column: "טור" };
const CONTAINER_WIDTH_OPTIONS: Array<"md" | "lg" | "xl"> = ["md", "lg", "xl"];
const CONTAINER_WIDTH_LABEL: Record<"md" | "lg" | "xl", string> = { md: "בינוני", lg: "גדול", xl: "רחב" };
const ICON_OPTIONS: IconToken[] = Object.keys(ICON_TOKEN_LABEL) as IconToken[];

type WhatsAppBannerSettingsPanelProps = { tab: EditorPanelId };

export function WhatsAppBannerSettingsPanel({ tab }: WhatsAppBannerSettingsPanelProps) {
  const whatsapp = useSectionSettings("whatsappBanner");
  const { updateSection } = useEditor();

  function onDiscreteChange(next: WhatsAppBannerEditorSettings) {
    updateSection("whatsappBanner", next);
  }

  if (tab === "content") {
    return (
      <>
        <TextField
          label="כותרת"
          value={whatsapp.content.title}
          maxLength={CONTENT_LIMITS.sectionTitle}
          onChange={(title) => onDiscreteChange({ ...whatsapp, content: { ...whatsapp.content, title } })}
        />
        <TextAreaField
          label="תיאור"
          value={whatsapp.content.description}
          maxLength={CONTENT_LIMITS.bannerDescription}
          onChange={(description) => onDiscreteChange({ ...whatsapp, content: { ...whatsapp.content, description } })}
        />
        <TextField
          label="טקסט כפתור"
          value={whatsapp.content.buttonLabel}
          maxLength={CONTENT_LIMITS.ctaLabel}
          onChange={(buttonLabel) => onDiscreteChange({ ...whatsapp, content: { ...whatsapp.content, buttonLabel } })}
        />
        <LinkControl
          label="קישור לקבוצת הוואטסאפ"
          value={whatsapp.content.whatsappUrl}
          required
          onChange={(whatsappUrl) => onDiscreteChange({ ...whatsapp, content: { ...whatsapp.content, whatsappUrl } })}
        />
        <ToggleField
          label="הצגת אייקון"
          checked={whatsapp.visibility.showIcon}
          onChange={(showIcon) => onDiscreteChange({ ...whatsapp, visibility: { ...whatsapp.visibility, showIcon } })}
        />
        {whatsapp.visibility.showIcon && (
          <TokenSelect
            label="אייקון"
            value={whatsapp.visibility.iconName}
            options={ICON_OPTIONS}
            labels={ICON_TOKEN_LABEL}
            onChange={(iconName) => onDiscreteChange({ ...whatsapp, visibility: { ...whatsapp.visibility, iconName } })}
          />
        )}
        <ToggleField
          label="הסתרה במובייל"
          checked={whatsapp.visibility.hideOnMobile}
          onChange={(hideOnMobile) => onDiscreteChange({ ...whatsapp, visibility: { ...whatsapp.visibility, hideOnMobile } })}
        />
      </>
    );
  }

  if (tab === "design") {
    return (
      <>
        <TokenPicker
          label="צבע רקע"
          value={whatsapp.appearance.backgroundColorToken}
          options={COLOR_OPTIONS}
          onChange={(backgroundColorToken) => onDiscreteChange({ ...whatsapp, appearance: { ...whatsapp.appearance, backgroundColorToken } })}
        />
        <TokenPicker
          label="צבע כותרת"
          value={whatsapp.appearance.titleColorToken}
          options={COLOR_OPTIONS}
          onChange={(titleColorToken) => onDiscreteChange({ ...whatsapp, appearance: { ...whatsapp.appearance, titleColorToken } })}
        />
        <ContrastWarning foreground={whatsapp.appearance.titleColorToken} background={whatsapp.appearance.backgroundColorToken} />
        <TokenPicker
          label="צבע תיאור"
          value={whatsapp.appearance.descriptionColorToken}
          options={COLOR_OPTIONS}
          onChange={(descriptionColorToken) => onDiscreteChange({ ...whatsapp, appearance: { ...whatsapp.appearance, descriptionColorToken } })}
        />
        <TokenSelect
          label="סגנון כפתור"
          value={whatsapp.appearance.buttonVariant}
          options={BUTTON_VARIANT_OPTIONS}
          labels={BUTTON_VARIANT_LABEL}
          onChange={(buttonVariant) => onDiscreteChange({ ...whatsapp, appearance: { ...whatsapp.appearance, buttonVariant } })}
        />
        <TokenSelect
          label="עיגול פינות"
          value={whatsapp.appearance.radiusToken}
          options={RADIUS_OPTIONS}
          labels={RADIUS_LABEL}
          onChange={(radiusToken) => onDiscreteChange({ ...whatsapp, appearance: { ...whatsapp.appearance, radiusToken } })}
        />
        <TokenSelect
          label="צל"
          value={whatsapp.appearance.shadowToken}
          options={SHADOW_OPTIONS}
          labels={SHADOW_TOKEN_LABEL}
          onChange={(shadowToken) => onDiscreteChange({ ...whatsapp, appearance: { ...whatsapp.appearance, shadowToken } })}
        />
      </>
    );
  }

  // layout
  return (
    <>
      <SegmentedControl
        label="יישור תוכן"
        value={whatsapp.layout.contentAlignment}
        options={ALIGN_OPTIONS}
        labels={ALIGN_LABEL}
        onChange={(contentAlignment) => onDiscreteChange({ ...whatsapp, layout: { ...whatsapp.layout, contentAlignment } })}
      />
      <SegmentedControl
        label="כיוון"
        value={whatsapp.layout.direction}
        options={DIRECTION_OPTIONS}
        labels={DIRECTION_LABEL}
        onChange={(direction) => onDiscreteChange({ ...whatsapp, layout: { ...whatsapp.layout, direction } })}
      />
      <TokenSelect
        label="רוחב מקסימלי לתוכן"
        value={whatsapp.layout.maxContentWidth}
        options={CONTAINER_WIDTH_OPTIONS}
        labels={CONTAINER_WIDTH_LABEL}
        onChange={(maxContentWidth) => onDiscreteChange({ ...whatsapp, layout: { ...whatsapp.layout, maxContentWidth } })}
      />
      <TokenSelect
        label="מרווח פנימי"
        value={whatsapp.layout.gap}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(gap) => onDiscreteChange({ ...whatsapp, layout: { ...whatsapp.layout, gap } })}
      />
      <TokenSelect
        label="Padding עליון"
        value={whatsapp.layout.paddingBlock.start}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(start) => onDiscreteChange({ ...whatsapp, layout: { ...whatsapp.layout, paddingBlock: { ...whatsapp.layout.paddingBlock, start } } })}
      />
      <TokenSelect
        label="Padding תחתון"
        value={whatsapp.layout.paddingBlock.end}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(end) => onDiscreteChange({ ...whatsapp, layout: { ...whatsapp.layout, paddingBlock: { ...whatsapp.layout.paddingBlock, end } } })}
      />
    </>
  );
}
