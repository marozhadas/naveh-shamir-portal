"use client";

import { useEditor } from "@/editor/hooks/use-editor";
import { useSectionSettings } from "@/editor/state/editor-selectors";
import { TextField, ToggleField } from "@/editor/components/EditorField/EditorField";
import { TokenPicker } from "@/editor/components/TokenPicker/TokenPicker";
import { TokenSelect } from "@/editor/components/TokenPicker/TokenSelect";
import { SegmentedControl } from "@/editor/components/TokenPicker/SegmentedControl";
import { LinkControl } from "@/editor/components/LinkControl/LinkControl";
import { EditableItemsList } from "@/editor/components/EditableItemsList/EditableItemsList";
import { ContrastWarning } from "@/editor/components/ContrastWarning/ContrastWarning";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import { SHADOW_TOKEN_LABEL, SPACING_TOKEN_LABEL } from "@/editor/config/editor-constants";
import { ICON_TOKEN_LABEL } from "@/styles/icon-token-map";
import type { ColorToken, EditorPanelId, IconToken, ShadowToken, SpacingToken } from "@/editor/types/editor.types";
import type { QuickLinkColorVariant } from "@/types/quick-link";
import type { QuickLinkItemSettings, QuickLinksEditorSettings } from "@/editor/schemas/quick-links.schema";

const COLOR_OPTIONS: ColorToken[] = ["surface", "background", "highlight", "text-primary", "text-secondary"];
const SPACING_OPTIONS: SpacingToken[] = ["0", "4", "8", "12", "16", "20", "24", "32"];
const RADIUS_OPTIONS: Array<"sm" | "md" | "lg" | "xl" | "pill"> = ["sm", "md", "lg", "xl", "pill"];
const RADIUS_LABEL: Record<"sm" | "md" | "lg" | "xl" | "pill", string> = {
  sm: "קטן",
  md: "בינוני",
  lg: "גדול",
  xl: "גדול מאוד",
  pill: "עגול",
};
const SHADOW_OPTIONS: ShadowToken[] = ["none", "sm", "card", "card-hover", "modal"];
const HOVER_OPTIONS: Array<QuickLinksEditorSettings["appearance"]["itemHoverEffect"]> = ["none", "background", "lift"];
const HOVER_LABEL: Record<QuickLinksEditorSettings["appearance"]["itemHoverEffect"], string> = {
  none: "ללא",
  background: "רקע",
  lift: "הרמה",
};
const ICON_OPTIONS: IconToken[] = Object.keys(ICON_TOKEN_LABEL) as IconToken[];
const COLOR_VARIANT_OPTIONS: QuickLinkColorVariant[] = ["yellow", "green", "blue", "orange"];
const COLOR_VARIANT_LABEL: Record<QuickLinkColorVariant, string> = { yellow: "צהוב", green: "ירוק", blue: "כחול", orange: "כתום" };
const ALIGN_OPTIONS: Array<"start" | "center"> = ["start", "center"];
const ALIGN_LABEL: Record<"start" | "center", string> = { start: "התחלה", center: "מרכז" };
const ICON_SIZE_OPTIONS: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];
const ICON_SIZE_LABEL: Record<"sm" | "md" | "lg", string> = { sm: "קטן", md: "בינוני", lg: "גדול" };
const CONTAINER_WIDTH_OPTIONS: Array<"md" | "lg" | "xl"> = ["md", "lg", "xl"];
const CONTAINER_WIDTH_LABEL: Record<"md" | "lg" | "xl", string> = { md: "בינוני", lg: "גדול", xl: "רחב" };

type QuickLinksSettingsPanelProps = { tab: EditorPanelId };

export function QuickLinksSettingsPanel({ tab }: QuickLinksSettingsPanelProps) {
  const quickLinks = useSectionSettings("quickLinks");
  const { updateSection } = useEditor();

  function onDiscreteChange(next: QuickLinksEditorSettings) {
    updateSection("quickLinks", next);
  }

  if (tab === "content") {
    return (
      <>
        <ToggleField
          label="הצגת כותרת לסקשן"
          checked={quickLinks.visibility.showSectionTitle}
          onChange={(showSectionTitle) => onDiscreteChange({ ...quickLinks, visibility: { ...quickLinks.visibility, showSectionTitle } })}
        />
        {quickLinks.visibility.showSectionTitle && (
          <TextField
            label="כותרת הסקשן"
            value={quickLinks.content.sectionTitle}
            maxLength={CONTENT_LIMITS.sectionTitle}
            onChange={(sectionTitle) => onDiscreteChange({ ...quickLinks, content: { ...quickLinks.content, sectionTitle } })}
          />
        )}
        <EditableItemsList
          items={quickLinks.content.items}
          minItems={2}
          maxItems={8}
          createItem={(): QuickLinkItemSettings => ({
            id: `quicklink-${Date.now()}`,
            label: "קישור חדש",
            href: "#",
            icon: "store",
            colorVariant: "yellow",
            visible: true,
          })}
          renderItemLabel={(item) => item.label || "(ללא טקסט)"}
          getVisible={(item) => item.visible}
          setVisible={(item, visible) => ({ ...item, visible })}
          onChange={(items) => onDiscreteChange({ ...quickLinks, content: { ...quickLinks.content, items } })}
          renderItemFields={(item, update) => (
            <>
              <TextField label="טקסט" value={item.label} maxLength={CONTENT_LIMITS.ctaLabel} required onChange={(label) => update({ label })} />
              <LinkControl label="קישור" value={item.href} required onChange={(href) => update({ href })} />
              <TokenSelect label="אייקון" value={item.icon} options={ICON_OPTIONS} labels={ICON_TOKEN_LABEL} onChange={(icon) => update({ icon })} />
              <SegmentedControl
                label="צבע"
                value={item.colorVariant}
                options={COLOR_VARIANT_OPTIONS}
                labels={COLOR_VARIANT_LABEL}
                onChange={(colorVariant) => update({ colorVariant })}
              />
            </>
          )}
        />
      </>
    );
  }

  if (tab === "design") {
    return (
      <>
        <TokenPicker
          label="צבע רקע הפאנל"
          value={quickLinks.appearance.panelBackgroundColorToken}
          options={COLOR_OPTIONS}
          onChange={(panelBackgroundColorToken) =>
            onDiscreteChange({ ...quickLinks, appearance: { ...quickLinks.appearance, panelBackgroundColorToken } })
          }
        />
        <TokenPicker
          label="צבע רקע כרטיס פריט"
          value={quickLinks.appearance.cardColorToken}
          options={COLOR_OPTIONS}
          onChange={(cardColorToken) => onDiscreteChange({ ...quickLinks, appearance: { ...quickLinks.appearance, cardColorToken } })}
        />
        <TokenPicker
          label="צבע טקסט"
          value={quickLinks.appearance.textColorToken}
          options={COLOR_OPTIONS}
          onChange={(textColorToken) => onDiscreteChange({ ...quickLinks, appearance: { ...quickLinks.appearance, textColorToken } })}
        />
        <ContrastWarning foreground={quickLinks.appearance.textColorToken} background={quickLinks.appearance.cardColorToken} />
        <TokenSelect
          label="עיגול פינות הפאנל"
          value={quickLinks.appearance.panelRadiusToken}
          options={RADIUS_OPTIONS}
          labels={RADIUS_LABEL}
          onChange={(panelRadiusToken) => onDiscreteChange({ ...quickLinks, appearance: { ...quickLinks.appearance, panelRadiusToken } })}
        />
        <TokenSelect
          label="צל הפאנל"
          value={quickLinks.appearance.panelShadowToken}
          options={SHADOW_OPTIONS}
          labels={SHADOW_TOKEN_LABEL}
          onChange={(panelShadowToken) => onDiscreteChange({ ...quickLinks, appearance: { ...quickLinks.appearance, panelShadowToken } })}
        />
        <TokenSelect
          label="אפקט Hover לפריט"
          value={quickLinks.appearance.itemHoverEffect}
          options={HOVER_OPTIONS}
          labels={HOVER_LABEL}
          onChange={(itemHoverEffect) => onDiscreteChange({ ...quickLinks, appearance: { ...quickLinks.appearance, itemHoverEffect } })}
        />
      </>
    );
  }

  // layout
  return (
    <>
      <SegmentedControl
        label="עמודות (דסקטופ)"
        value={String(quickLinks.layout.columnsDesktop) as "3" | "4" | "5" | "6"}
        options={["3", "4", "5", "6"]}
        labels={{ "3": "3", "4": "4", "5": "5", "6": "6" }}
        onChange={(value) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, columnsDesktop: Number(value) as 3 | 4 | 5 | 6 } })}
      />
      <SegmentedControl
        label="עמודות (טאבלט)"
        value={String(quickLinks.layout.columnsTablet) as "2" | "3" | "4"}
        options={["2", "3", "4"]}
        labels={{ "2": "2", "3": "3", "4": "4" }}
        onChange={(value) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, columnsTablet: Number(value) as 2 | 3 | 4 } })}
      />
      <SegmentedControl
        label="עמודות (מובייל)"
        value={String(quickLinks.layout.columnsMobile) as "1" | "2"}
        options={["1", "2"]}
        labels={{ "1": "1", "2": "2" }}
        onChange={(value) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, columnsMobile: Number(value) as 1 | 2 } })}
      />
      <TokenSelect
        label="מרווח בין פריטים"
        value={quickLinks.layout.gap}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(gap) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, gap } })}
      />
      <TokenSelect
        label="Padding אנכי"
        value={quickLinks.layout.paddingBlock}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(paddingBlock) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, paddingBlock } })}
      />
      <TokenSelect
        label="Padding אופקי"
        value={quickLinks.layout.paddingInline}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(paddingInline) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, paddingInline } })}
      />
      <SegmentedControl
        label="יישור תוכן"
        value={quickLinks.layout.contentAlignment}
        options={ALIGN_OPTIONS}
        labels={ALIGN_LABEL}
        onChange={(contentAlignment) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, contentAlignment } })}
      />
      <TokenSelect
        label="גודל אייקון"
        value={quickLinks.layout.iconSize}
        options={ICON_SIZE_OPTIONS}
        labels={ICON_SIZE_LABEL}
        onChange={(iconSize) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, iconSize } })}
      />
      <TokenSelect
        label="Padding בתוך פריט"
        value={quickLinks.layout.itemPadding}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(itemPadding) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, itemPadding } })}
      />
      <TokenSelect
        label="רוחב מקסימלי לתוכן"
        value={quickLinks.layout.containerMaxWidth}
        options={CONTAINER_WIDTH_OPTIONS}
        labels={CONTAINER_WIDTH_LABEL}
        onChange={(containerMaxWidth) => onDiscreteChange({ ...quickLinks, layout: { ...quickLinks.layout, containerMaxWidth } })}
      />
    </>
  );
}
