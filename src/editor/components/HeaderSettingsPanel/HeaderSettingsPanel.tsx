"use client";

import { useEditor } from "@/editor/hooks/use-editor";
import { useSectionSettings } from "@/editor/state/editor-selectors";
import { TextField, ToggleField } from "@/editor/components/EditorField/EditorField";
import { TokenPicker } from "@/editor/components/TokenPicker/TokenPicker";
import { TokenSelect } from "@/editor/components/TokenPicker/TokenSelect";
import { ImageControl } from "@/editor/components/ImageControl/ImageControl";
import { LinkControl } from "@/editor/components/LinkControl/LinkControl";
import { EditableItemsList } from "@/editor/components/EditableItemsList/EditableItemsList";
import { ContrastWarning } from "@/editor/components/ContrastWarning/ContrastWarning";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import { SPACING_TOKEN_LABEL, SHADOW_TOKEN_LABEL } from "@/editor/config/editor-constants";
import type { ColorToken, EditorPanelId, ShadowToken, SpacingToken } from "@/editor/types/editor.types";
import type { ButtonVariant } from "@/components/ui/Button";
import type { HeaderEditorSettings } from "@/editor/schemas/header.schema";

const COLOR_OPTIONS: ColorToken[] = ["surface", "background", "inverse", "navy", "text-primary", "text-secondary", "text-inverse", "muted"];
const SPACING_OPTIONS: SpacingToken[] = ["0", "4", "8", "12", "16", "20", "24", "32", "40", "48"];
const SHADOW_OPTIONS: ShadowToken[] = ["none", "sm", "card"];
const CONTAINER_WIDTH_OPTIONS: Array<"md" | "lg" | "xl"> = ["md", "lg", "xl"];
const CONTAINER_WIDTH_LABEL: Record<"md" | "lg" | "xl", string> = { md: "בינוני (1024px)", lg: "גדול (1280px)", xl: "רחב (1440px)" };
const BUTTON_VARIANT_OPTIONS: Array<"primary" | "secondary" | "accent"> = ["primary", "secondary", "accent"];
const BUTTON_VARIANT_LABEL: Record<ButtonVariant, string> = { primary: "ראשי", secondary: "משני", accent: "הדגשה", whatsapp: "וואטסאפ", navy: "כחול כהה" };

type HeaderSettingsPanelProps = { tab: EditorPanelId };

export function HeaderSettingsPanel({ tab }: HeaderSettingsPanelProps) {
  const header = useSectionSettings("header");
  const { updateSection } = useEditor();

  function onDiscreteChange(next: HeaderEditorSettings) {
    updateSection("header", next);
  }

  if (tab === "content") {
    return (
      <>
        <ImageControl
          label="לוגו"
          value={header.content.logo}
          onChange={(logo) => onDiscreteChange({ ...header, content: { ...header.content, logo } })}
        />
        <EditableItemsList
          items={header.content.navItems}
          minItems={1}
          maxItems={8}
          createItem={() => ({ id: `nav-${Date.now()}`, label: "קישור חדש", href: "#", visible: true })}
          renderItemLabel={(item) => item.label || "(ללא טקסט)"}
          getVisible={(item) => item.visible}
          setVisible={(item, visible) => ({ ...item, visible })}
          onChange={(navItems) => onDiscreteChange({ ...header, content: { ...header.content, navItems } })}
          renderItemFields={(item, update) => (
            <>
              <TextField label="טקסט" value={item.label} maxLength={CONTENT_LIMITS.ctaLabel} required onChange={(label) => update({ label })} />
              <LinkControl label="קישור" value={item.href} required onChange={(href) => update({ href })} />
            </>
          )}
        />
        <TextField
          label="טקסט כפתור פעולה"
          value={header.content.ctaLabel}
          maxLength={CONTENT_LIMITS.ctaLabel}
          required
          onChange={(ctaLabel) => onDiscreteChange({ ...header, content: { ...header.content, ctaLabel } })}
        />
        <LinkControl
          label="קישור כפתור פעולה"
          value={header.content.ctaHref}
          required
          onChange={(ctaHref) => onDiscreteChange({ ...header, content: { ...header.content, ctaHref } })}
        />
        <ToggleField
          label="הצגת כפתור אזור אישי"
          checked={header.content.showPersonalAreaButton}
          onChange={(showPersonalAreaButton) => onDiscreteChange({ ...header, content: { ...header.content, showPersonalAreaButton } })}
        />
        {header.content.showPersonalAreaButton && (
          <>
            <TextField
              label="טקסט אזור אישי"
              value={header.content.personalAreaLabel}
              maxLength={CONTENT_LIMITS.ctaLabel}
              required
              onChange={(personalAreaLabel) => onDiscreteChange({ ...header, content: { ...header.content, personalAreaLabel } })}
            />
            <LinkControl
              label="קישור אזור אישי"
              value={header.content.personalAreaHref}
              onChange={(personalAreaHref) => onDiscreteChange({ ...header, content: { ...header.content, personalAreaHref } })}
            />
          </>
        )}
      </>
    );
  }

  if (tab === "design") {
    return (
      <>
        <TokenPicker
          label="צבע רקע"
          value={header.appearance.backgroundColorToken}
          options={COLOR_OPTIONS}
          onChange={(backgroundColorToken) => onDiscreteChange({ ...header, appearance: { ...header.appearance, backgroundColorToken } })}
        />
        <TokenPicker
          label="צבע טקסט"
          value={header.appearance.textColorToken}
          options={COLOR_OPTIONS}
          onChange={(textColorToken) => onDiscreteChange({ ...header, appearance: { ...header.appearance, textColorToken } })}
        />
        <ContrastWarning foreground={header.appearance.textColorToken} background={header.appearance.backgroundColorToken} />
        <TokenPicker
          label="צבע קישורי ניווט"
          value={header.appearance.linkColorToken}
          options={COLOR_OPTIONS}
          onChange={(linkColorToken) => onDiscreteChange({ ...header, appearance: { ...header.appearance, linkColorToken } })}
        />
        <ContrastWarning foreground={header.appearance.linkColorToken} background={header.appearance.backgroundColorToken} />
        <TokenSelect
          label="סגנון כפתור פעולה"
          value={header.appearance.ctaVariant}
          options={BUTTON_VARIANT_OPTIONS}
          labels={BUTTON_VARIANT_LABEL}
          onChange={(ctaVariant) => onDiscreteChange({ ...header, appearance: { ...header.appearance, ctaVariant } })}
        />
        <TokenSelect
          label="צל הכותרת"
          value={header.appearance.headerShadow}
          options={SHADOW_OPTIONS}
          labels={SHADOW_TOKEN_LABEL}
          onChange={(headerShadow) => onDiscreteChange({ ...header, appearance: { ...header.appearance, headerShadow } })}
        />
        <ToggleField
          label="כותרת דביקה (Sticky)"
          checked={header.appearance.sticky}
          onChange={(sticky) => onDiscreteChange({ ...header, appearance: { ...header.appearance, sticky } })}
        />
      </>
    );
  }

  // layout
  return (
    <>
      <TokenSelect
        label="רוחב מקסימלי לתוכן"
        value={header.layout.containerMaxWidth}
        options={CONTAINER_WIDTH_OPTIONS}
        labels={CONTAINER_WIDTH_LABEL}
        onChange={(containerMaxWidth) => onDiscreteChange({ ...header, layout: { ...header.layout, containerMaxWidth } })}
      />
      <TokenSelect
        label="מרווח בין פריטי ניווט"
        value={header.layout.navItemGap}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(navItemGap) => onDiscreteChange({ ...header, layout: { ...header.layout, navItemGap } })}
      />
      <TokenSelect
        label="מרווח בין לוגו לניווט"
        value={header.layout.logoNavGap}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(logoNavGap) => onDiscreteChange({ ...header, layout: { ...header.layout, logoNavGap } })}
      />
      <ToggleField
        label="הצגת ניווט בדסקטופ"
        checked={header.layout.showDesktopNav}
        onChange={(showDesktopNav) => onDiscreteChange({ ...header, layout: { ...header.layout, showDesktopNav } })}
      />
    </>
  );
}
