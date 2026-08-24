"use client";

import { useEditor } from "@/editor/hooks/use-editor";
import { useSectionSettings } from "@/editor/state/editor-selectors";
import { TextField, TextAreaField, ToggleField } from "@/editor/components/EditorField/EditorField";
import { TokenPicker } from "@/editor/components/TokenPicker/TokenPicker";
import { TokenSelect } from "@/editor/components/TokenPicker/TokenSelect";
import { SegmentedControl } from "@/editor/components/TokenPicker/SegmentedControl";
import { ImageControl } from "@/editor/components/ImageControl/ImageControl";
import { LinkControl } from "@/editor/components/LinkControl/LinkControl";
import { EditableItemsList } from "@/editor/components/EditableItemsList/EditableItemsList";
import { ContrastWarning } from "@/editor/components/ContrastWarning/ContrastWarning";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import { SHADOW_TOKEN_LABEL, SPACING_TOKEN_LABEL } from "@/editor/config/editor-constants";
import type { ButtonVariant } from "@/components/ui/Button";
import type { BusinessCategory } from "@/types/business";
import type { ColorToken, EditorPanelId, ShadowToken, SpacingToken } from "@/editor/types/editor.types";
import type { BusinessCardContentSettings, FeaturedBusinessesEditorSettings } from "@/editor/schemas/businesses.schema";

const COLOR_OPTIONS: ColorToken[] = ["background", "surface", "highlight", "text-primary", "text-secondary"];
const SPACING_OPTIONS: SpacingToken[] = ["8", "12", "16", "20", "24", "32", "48", "64"];
const RADIUS_OPTIONS: Array<"sm" | "md" | "lg" | "xl" | "pill"> = ["sm", "md", "lg", "xl", "pill"];
const RADIUS_LABEL: Record<"sm" | "md" | "lg" | "xl" | "pill", string> = {
  sm: "קטן",
  md: "בינוני",
  lg: "גדול",
  xl: "גדול מאוד",
  pill: "עגול",
};
const SHADOW_OPTIONS: ShadowToken[] = ["none", "sm", "card", "card-hover", "modal"];
const ASPECT_OPTIONS: Array<"1:1" | "4:3" | "16:9"> = ["1:1", "4:3", "16:9"];
const ASPECT_LABEL: Record<"1:1" | "4:3" | "16:9", string> = { "1:1": "ריבוע (1:1)", "4:3": "רגיל (4:3)", "16:9": "רחב (16:9)" };
const HOVER_OPTIONS: Array<"none" | "lift"> = ["none", "lift"];
const HOVER_LABEL: Record<"none" | "lift", string> = { none: "ללא", lift: "הרמה" };
const BUTTON_VARIANT_OPTIONS: ButtonVariant[] = ["navy", "primary", "secondary", "accent"];
const BUTTON_VARIANT_LABEL: Record<ButtonVariant, string> = { primary: "ראשי", secondary: "משני", accent: "הדגשה", whatsapp: "וואטסאפ", navy: "כחול כהה" };
const CATEGORY_OPTIONS: BusinessCategory[] = ["אוכל", "חוגים", 'גמ"ח', "שירותים"];
const ALIGN_OPTIONS: Array<"start" | "center"> = ["start", "center"];
const ALIGN_LABEL: Record<"start" | "center", string> = { start: "התחלה", center: "מרכז" };
const CONTAINER_WIDTH_OPTIONS: Array<"md" | "lg" | "xl"> = ["md", "lg", "xl"];
const CONTAINER_WIDTH_LABEL: Record<"md" | "lg" | "xl", string> = { md: "בינוני", lg: "גדול", xl: "רחב" };
const VISIBLE_COUNT_OPTIONS = ["1", "2", "3", "4"] as const;

type FeaturedBusinessesSettingsPanelProps = { tab: EditorPanelId };

export function FeaturedBusinessesSettingsPanel({ tab }: FeaturedBusinessesSettingsPanelProps) {
  const businesses = useSectionSettings("featuredBusinesses");
  const { updateSection } = useEditor();

  function onDiscreteChange(next: FeaturedBusinessesEditorSettings) {
    updateSection("featuredBusinesses", next);
  }

  function updateCards(cards: FeaturedBusinessesEditorSettings["content"]["cards"]) {
    // cardsOrder must always list exactly the same ids as cards (schema invariant) — kept in
    // sync here so add/duplicate/delete never has to be special-cased against the order array.
    const ids = new Set(cards.map((card) => card.id));
    const nextOrder = businesses.content.cardsOrder.filter((id) => ids.has(id));
    for (const card of cards) if (!nextOrder.includes(card.id)) nextOrder.push(card.id);
    onDiscreteChange({ ...businesses, content: { ...businesses.content, cards, cardsOrder: nextOrder } });
  }

  if (tab === "content") {
    return (
      <>
        <TextField
          label="כותרת הסקשן"
          value={businesses.content.sectionTitle}
          maxLength={CONTENT_LIMITS.sectionTitle}
          required
          onChange={(sectionTitle) => onDiscreteChange({ ...businesses, content: { ...businesses.content, sectionTitle } })}
        />
        <SegmentedControl
          label="מספר עסקים מוצגים"
          value={String(businesses.content.visibleCount) as (typeof VISIBLE_COUNT_OPTIONS)[number]}
          options={VISIBLE_COUNT_OPTIONS}
          labels={{ "1": "1", "2": "2", "3": "3", "4": "4" }}
          onChange={(value) => onDiscreteChange({ ...businesses, content: { ...businesses.content, visibleCount: Number(value) as 1 | 2 | 3 | 4 } })}
        />
        <ToggleField
          label={'הצגת קישור "לכל העסקים"'}
          checked={businesses.content.showAllLinkVisible}
          onChange={(showAllLinkVisible) => onDiscreteChange({ ...businesses, content: { ...businesses.content, showAllLinkVisible } })}
        />
        {businesses.content.showAllLinkVisible && (
          <>
            <TextField
              label="טקסט הקישור"
              value={businesses.content.showAllLinkLabel}
              maxLength={CONTENT_LIMITS.ctaLabel}
              onChange={(showAllLinkLabel) => onDiscreteChange({ ...businesses, content: { ...businesses.content, showAllLinkLabel } })}
            />
            <LinkControl
              label={'קישור "לכל העסקים"'}
              value={businesses.content.showAllLinkHref}
              onChange={(showAllLinkHref) => onDiscreteChange({ ...businesses, content: { ...businesses.content, showAllLinkHref } })}
            />
          </>
        )}
        <EditableItemsList
          items={businesses.content.cards}
          minItems={1}
          maxItems={12}
          createItem={(): BusinessCardContentSettings => ({
            id: `business-${Date.now()}`,
            slug: `business-${Date.now()}`,
            name: "עסק חדש",
            category: "שירותים",
            description: "",
            image: { src: "/images/businesses/garage.jpg", alt: "", objectFit: "cover" },
            callButtonLabel: "התקשרו",
            whatsappButtonLabel: "וואטסאפ",
            phone: "",
            whatsappUrl: "",
            cardUrl: "",
            visible: true,
          })}
          renderItemLabel={(item) => item.name || "(עסק ללא שם)"}
          getVisible={(item) => item.visible}
          setVisible={(item, visible) => ({ ...item, visible })}
          onChange={updateCards}
          renderItemFields={(item, update) => (
            <>
              <TextField label="שם העסק" value={item.name} maxLength={CONTENT_LIMITS.cardTitle} required onChange={(name) => update({ name })} />
              <SegmentedControl label="קטגוריה" value={item.category} options={CATEGORY_OPTIONS} labels={{ אוכל: "אוכל", חוגים: "חוגים", 'גמ"ח': 'גמ"ח', שירותים: "שירותים" }} onChange={(category) => update({ category })} />
              <TextAreaField label="תיאור" value={item.description} maxLength={CONTENT_LIMITS.cardDescription} onChange={(description) => update({ description })} />
              <ImageControl label="תמונה" value={item.image} onChange={(image) => update({ image })} />
              <TextField label="טקסט כפתור טלפון" value={item.callButtonLabel} maxLength={CONTENT_LIMITS.ctaLabel} required onChange={(callButtonLabel) => update({ callButtonLabel })} />
              <LinkControl label="טלפון (tel:+972...)" value={item.phone} onChange={(phone) => update({ phone })} />
              <TextField label="טקסט כפתור וואטסאפ" value={item.whatsappButtonLabel} maxLength={CONTENT_LIMITS.ctaLabel} required onChange={(whatsappButtonLabel) => update({ whatsappButtonLabel })} />
              <LinkControl label="קישור וואטסאפ" value={item.whatsappUrl} onChange={(whatsappUrl) => update({ whatsappUrl })} />
              <LinkControl label="קישור לעמוד העסק" value={item.cardUrl} onChange={(cardUrl) => update({ cardUrl })} />
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
          label="צבע רקע הסקשן"
          value={businesses.appearance.sectionBackgroundColorToken}
          options={COLOR_OPTIONS}
          onChange={(sectionBackgroundColorToken) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, sectionBackgroundColorToken } })}
        />
        <TokenPicker
          label="צבע כותרת"
          value={businesses.appearance.titleColorToken}
          options={COLOR_OPTIONS}
          onChange={(titleColorToken) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, titleColorToken } })}
        />
        <TokenPicker
          label="צבע רקע כרטיס"
          value={businesses.appearance.cardBackgroundColorToken}
          options={COLOR_OPTIONS}
          onChange={(cardBackgroundColorToken) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, cardBackgroundColorToken } })}
        />
        <TokenPicker
          label="צבע טקסט בכרטיס"
          value={businesses.appearance.textColorToken}
          options={COLOR_OPTIONS}
          onChange={(textColorToken) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, textColorToken } })}
        />
        <ContrastWarning foreground={businesses.appearance.textColorToken} background={businesses.appearance.cardBackgroundColorToken} />
        <TokenSelect label="עיגול פינות כרטיס" value={businesses.appearance.cardRadiusToken} options={RADIUS_OPTIONS} labels={RADIUS_LABEL} onChange={(cardRadiusToken) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, cardRadiusToken } })} />
        <TokenSelect label="צל כרטיס" value={businesses.appearance.cardShadowToken} options={SHADOW_OPTIONS} labels={SHADOW_TOKEN_LABEL} onChange={(cardShadowToken) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, cardShadowToken } })} />
        <TokenSelect label="יחס תמונה" value={businesses.appearance.imageAspectRatio} options={ASPECT_OPTIONS} labels={ASPECT_LABEL} onChange={(imageAspectRatio) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, imageAspectRatio } })} />
        <TokenSelect label="אפקט Hover לכרטיס" value={businesses.appearance.cardHoverEffect} options={HOVER_OPTIONS} labels={HOVER_LABEL} onChange={(cardHoverEffect) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, cardHoverEffect } })} />
        <TokenSelect label="סגנון כפתורים" value={businesses.appearance.buttonVariant} options={BUTTON_VARIANT_OPTIONS} labels={BUTTON_VARIANT_LABEL} onChange={(buttonVariant) => onDiscreteChange({ ...businesses, appearance: { ...businesses.appearance, buttonVariant } })} />
      </>
    );
  }

  // layout
  return (
    <>
      <SegmentedControl label="עמודות (דסקטופ)" value={String(businesses.layout.columnsDesktop) as "2" | "3" | "4"} options={["2", "3", "4"]} labels={{ "2": "2", "3": "3", "4": "4" }} onChange={(value) => onDiscreteChange({ ...businesses, layout: { ...businesses.layout, columnsDesktop: Number(value) as 2 | 3 | 4 } })} />
      <SegmentedControl label="עמודות (טאבלט)" value={String(businesses.layout.columnsTablet) as "1" | "2"} options={["1", "2"]} labels={{ "1": "1", "2": "2" }} onChange={(value) => onDiscreteChange({ ...businesses, layout: { ...businesses.layout, columnsTablet: Number(value) as 1 | 2 } })} />
      <TokenSelect label="מרווח בין כרטיסים" value={businesses.layout.gap} options={SPACING_OPTIONS} labels={SPACING_TOKEN_LABEL} onChange={(gap) => onDiscreteChange({ ...businesses, layout: { ...businesses.layout, gap } })} />
      <TokenSelect label="רוחב מקסימלי לתוכן" value={businesses.layout.containerMaxWidth} options={CONTAINER_WIDTH_OPTIONS} labels={CONTAINER_WIDTH_LABEL} onChange={(containerMaxWidth) => onDiscreteChange({ ...businesses, layout: { ...businesses.layout, containerMaxWidth } })} />
      <TokenSelect label="Padding עליון" value={businesses.layout.sectionPaddingBlock.start} options={SPACING_OPTIONS} labels={SPACING_TOKEN_LABEL} onChange={(start) => onDiscreteChange({ ...businesses, layout: { ...businesses.layout, sectionPaddingBlock: { ...businesses.layout.sectionPaddingBlock, start } } })} />
      <TokenSelect label="Padding תחתון" value={businesses.layout.sectionPaddingBlock.end} options={SPACING_OPTIONS} labels={SPACING_TOKEN_LABEL} onChange={(end) => onDiscreteChange({ ...businesses, layout: { ...businesses.layout, sectionPaddingBlock: { ...businesses.layout.sectionPaddingBlock, end } } })} />
      <SegmentedControl label="יישור כותרת" value={businesses.layout.titleAlignment} options={ALIGN_OPTIONS} labels={ALIGN_LABEL} onChange={(titleAlignment) => onDiscreteChange({ ...businesses, layout: { ...businesses.layout, titleAlignment } })} />
    </>
  );
}
