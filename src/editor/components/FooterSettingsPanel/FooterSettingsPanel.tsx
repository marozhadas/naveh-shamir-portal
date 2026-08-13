"use client";

import { useEditor } from "@/editor/hooks/use-editor";
import { useSectionSettings } from "@/editor/state/editor-selectors";
import { TextField, TextAreaField } from "@/editor/components/EditorField/EditorField";
import { TokenPicker } from "@/editor/components/TokenPicker/TokenPicker";
import { TokenSelect } from "@/editor/components/TokenPicker/TokenSelect";
import { SegmentedControl } from "@/editor/components/TokenPicker/SegmentedControl";
import { ImageControl } from "@/editor/components/ImageControl/ImageControl";
import { LinkControl } from "@/editor/components/LinkControl/LinkControl";
import { EditableItemsList } from "@/editor/components/EditableItemsList/EditableItemsList";
import { ContrastWarning } from "@/editor/components/ContrastWarning/ContrastWarning";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import { SPACING_TOKEN_LABEL } from "@/editor/config/editor-constants";
import type { ColorToken, EditorPanelId, SpacingToken } from "@/editor/types/editor.types";
import type { FooterEditorSettings } from "@/editor/schemas/footer.schema";

const COLOR_OPTIONS: ColorToken[] = ["inverse", "surface", "background", "navy", "navy-muted", "text-inverse", "text-primary", "muted"];
const SPACING_OPTIONS: SpacingToken[] = ["16", "20", "24", "32", "40", "48", "64"];
const LOGO_SIZE_OPTIONS: Array<"sm" | "md" | "lg"> = ["sm", "md", "lg"];
const LOGO_SIZE_LABEL: Record<"sm" | "md" | "lg", string> = { sm: "קטן", md: "בינוני", lg: "גדול" };
const COLUMNS_DESKTOP_OPTIONS = [2, 3, 4] as const;
const COLUMNS_TABLET_OPTIONS = [1, 2] as const;
const ALIGN_OPTIONS: Array<"start" | "space-between"> = ["start", "space-between"];
const ALIGN_LABELS: Record<"start" | "space-between", string> = { start: "התחלה", "space-between": "מרווח שווה" };

type FooterSettingsPanelProps = { tab: EditorPanelId };

export function FooterSettingsPanel({ tab }: FooterSettingsPanelProps) {
  const footer = useSectionSettings("footer");
  const { updateSection } = useEditor();

  function onDiscreteChange(next: FooterEditorSettings) {
    updateSection("footer", next);
  }

  if (tab === "content") {
    return (
      <>
        <ImageControl
          label="לוגו"
          value={footer.content.logo}
          onChange={(logo) => onDiscreteChange({ ...footer, content: { ...footer.content, logo } })}
        />
        <TextAreaField
          label="תיאור הפורטל"
          value={footer.content.description}
          maxLength={CONTENT_LIMITS.footerDescription}
          onChange={(description) => onDiscreteChange({ ...footer, content: { ...footer.content, description } })}
        />
        <TextField
          label="כותרת עמודת ניווט"
          value={footer.content.navColumnTitle}
          maxLength={CONTENT_LIMITS.footerColumnTitle}
          required
          onChange={(navColumnTitle) => onDiscreteChange({ ...footer, content: { ...footer.content, navColumnTitle } })}
        />
        <EditableItemsList
          items={footer.content.navItems}
          minItems={1}
          maxItems={8}
          createItem={() => ({ id: `footer-nav-${Date.now()}`, label: "קישור חדש", href: "#", visible: true })}
          renderItemLabel={(item) => item.label || "(ללא טקסט)"}
          getVisible={(item) => item.visible}
          setVisible={(item, visible) => ({ ...item, visible })}
          onChange={(navItems) => onDiscreteChange({ ...footer, content: { ...footer.content, navItems } })}
          renderItemFields={(item, update) => (
            <>
              <TextField label="טקסט" value={item.label} maxLength={CONTENT_LIMITS.ctaLabel} required onChange={(label) => update({ label })} />
              <LinkControl label="קישור" value={item.href} required onChange={(href) => update({ href })} />
            </>
          )}
        />
        <TextField
          label="כותרת עמודת מידע חיוני"
          value={footer.content.essentialColumnTitle}
          maxLength={CONTENT_LIMITS.footerColumnTitle}
          required
          onChange={(essentialColumnTitle) => onDiscreteChange({ ...footer, content: { ...footer.content, essentialColumnTitle } })}
        />
        <TextField
          label="טקסט קרדיט"
          value={footer.content.creditText}
          maxLength={CONTENT_LIMITS.footerCreditText}
          required
          onChange={(creditText) => onDiscreteChange({ ...footer, content: { ...footer.content, creditText } })}
        />
        <LinkControl
          label="קישור טקסט הקרדיט (אופציונלי)"
          value={footer.content.creditUrl}
          onChange={(creditUrl) => onDiscreteChange({ ...footer, content: { ...footer.content, creditUrl } })}
        />
        <p style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          קישורי המידע המשפטי (מדיניות פרטיות, תנאי שימוש, הצהרת נגישות) מוצגים תמיד ואינם ניתנים להסתרה.
        </p>
      </>
    );
  }

  if (tab === "design") {
    return (
      <>
        <TokenPicker
          label="צבע רקע"
          value={footer.appearance.backgroundColorToken}
          options={COLOR_OPTIONS}
          onChange={(backgroundColorToken) => onDiscreteChange({ ...footer, appearance: { ...footer.appearance, backgroundColorToken } })}
        />
        <TokenPicker
          label="צבע טקסט"
          value={footer.appearance.textColorToken}
          options={COLOR_OPTIONS}
          onChange={(textColorToken) => onDiscreteChange({ ...footer, appearance: { ...footer.appearance, textColorToken } })}
        />
        <ContrastWarning foreground={footer.appearance.textColorToken} background={footer.appearance.backgroundColorToken} />
        <TokenPicker
          label="צבע קישורים"
          value={footer.appearance.linkColorToken}
          options={COLOR_OPTIONS}
          onChange={(linkColorToken) => onDiscreteChange({ ...footer, appearance: { ...footer.appearance, linkColorToken } })}
        />
        <TokenPicker
          label="צבע קישורים (Hover)"
          value={footer.appearance.linkHoverColorToken}
          options={COLOR_OPTIONS}
          onChange={(linkHoverColorToken) => onDiscreteChange({ ...footer, appearance: { ...footer.appearance, linkHoverColorToken } })}
        />
        <TokenPicker
          label="צבע גבול עליון"
          value={footer.appearance.borderColorToken}
          options={COLOR_OPTIONS}
          onChange={(borderColorToken) => onDiscreteChange({ ...footer, appearance: { ...footer.appearance, borderColorToken } })}
        />
        <TokenSelect
          label="גודל לוגו"
          value={footer.appearance.logoSizeToken}
          options={LOGO_SIZE_OPTIONS}
          labels={LOGO_SIZE_LABEL}
          onChange={(logoSizeToken) => onDiscreteChange({ ...footer, appearance: { ...footer.appearance, logoSizeToken } })}
        />
      </>
    );
  }

  // layout
  return (
    <>
      <SegmentedControl
        label="מספר עמודות (דסקטופ)"
        value={String(footer.layout.columnsDesktop) as "2" | "3" | "4"}
        options={COLUMNS_DESKTOP_OPTIONS.map(String) as Array<"2" | "3" | "4">}
        labels={{ "2": "2", "3": "3", "4": "4" }}
        onChange={(value) =>
          onDiscreteChange({ ...footer, layout: { ...footer.layout, columnsDesktop: Number(value) as 2 | 3 | 4 } })
        }
      />
      <SegmentedControl
        label="מספר עמודות (טאבלט)"
        value={String(footer.layout.columnsTablet) as "1" | "2"}
        options={COLUMNS_TABLET_OPTIONS.map(String) as Array<"1" | "2">}
        labels={{ "1": "1", "2": "2" }}
        onChange={(value) =>
          onDiscreteChange({ ...footer, layout: { ...footer.layout, columnsTablet: Number(value) as 1 | 2 } })
        }
      />
      <TokenSelect
        label="מרווח בין עמודות"
        value={footer.layout.gap}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(gap) => onDiscreteChange({ ...footer, layout: { ...footer.layout, gap } })}
      />
      <TokenSelect
        label="Padding עליון"
        value={footer.layout.paddingBlockStart}
        options={SPACING_OPTIONS}
        labels={SPACING_TOKEN_LABEL}
        onChange={(paddingBlockStart) => onDiscreteChange({ ...footer, layout: { ...footer.layout, paddingBlockStart } })}
      />
      <SegmentedControl
        label="יישור שורת הקרדיטים"
        value={footer.layout.contentAlignment}
        options={ALIGN_OPTIONS}
        labels={ALIGN_LABELS}
        onChange={(contentAlignment) => onDiscreteChange({ ...footer, layout: { ...footer.layout, contentAlignment } })}
      />
    </>
  );
}
