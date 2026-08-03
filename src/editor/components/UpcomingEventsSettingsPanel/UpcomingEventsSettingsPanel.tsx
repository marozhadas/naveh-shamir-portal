"use client";

import { useEditor } from "@/editor/hooks/use-editor";
import { useSectionSettings } from "@/editor/state/editor-selectors";
import { TextField, TextAreaField, ToggleField } from "@/editor/components/EditorField/EditorField";
import { TokenPicker } from "@/editor/components/TokenPicker/TokenPicker";
import { TokenSelect } from "@/editor/components/TokenPicker/TokenSelect";
import { SegmentedControl } from "@/editor/components/TokenPicker/SegmentedControl";
import { LinkControl } from "@/editor/components/LinkControl/LinkControl";
import { EditableItemsList } from "@/editor/components/EditableItemsList/EditableItemsList";
import { ContrastWarning } from "@/editor/components/ContrastWarning/ContrastWarning";
import { CONTENT_LIMITS } from "@/editor/schemas/content-limits";
import { SHADOW_TOKEN_LABEL, SPACING_TOKEN_LABEL } from "@/editor/config/editor-constants";
import type { ButtonVariant } from "@/components/ui/Button";
import type { ColorToken, EditorPanelId, ShadowToken, SpacingToken } from "@/editor/types/editor.types";
import type { EventCardContentSettings, UpcomingEventsEditorSettings } from "@/editor/schemas/events.schema";

const COLOR_OPTIONS: ColorToken[] = ["background", "surface", "highlight", "text-primary", "text-secondary", "green"];
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
const BUTTON_VARIANT_OPTIONS: ButtonVariant[] = ["primary", "secondary", "accent"];
const BUTTON_VARIANT_LABEL: Record<ButtonVariant, string> = { primary: "ראשי", secondary: "משני", accent: "הדגשה", whatsapp: "וואטסאפ" };
const ALIGN_OPTIONS: Array<"start" | "center"> = ["start", "center"];
const ALIGN_LABEL: Record<"start" | "center", string> = { start: "התחלה", center: "מרכז" };
const CONTAINER_WIDTH_OPTIONS: Array<"md" | "lg" | "xl"> = ["md", "lg", "xl"];
const CONTAINER_WIDTH_LABEL: Record<"md" | "lg" | "xl", string> = { md: "בינוני", lg: "גדול", xl: "רחב" };
const VISIBLE_COUNT_OPTIONS = ["1", "2", "3"] as const;

type UpcomingEventsSettingsPanelProps = { tab: EditorPanelId };

export function UpcomingEventsSettingsPanel({ tab }: UpcomingEventsSettingsPanelProps) {
  const events = useSectionSettings("upcomingEvents");
  const { updateSection } = useEditor();

  function onDiscreteChange(next: UpcomingEventsEditorSettings) {
    updateSection("upcomingEvents", next);
  }

  function updateEvents(list: UpcomingEventsEditorSettings["content"]["events"]) {
    const ids = new Set(list.map((event) => event.id));
    const nextOrder = events.content.eventsOrder.filter((id) => ids.has(id));
    for (const event of list) if (!nextOrder.includes(event.id)) nextOrder.push(event.id);
    onDiscreteChange({ ...events, content: { ...events.content, events: list, eventsOrder: nextOrder } });
  }

  if (tab === "content") {
    return (
      <>
        <TextField
          label="כותרת הסקשן"
          value={events.content.sectionTitle}
          maxLength={CONTENT_LIMITS.sectionTitle}
          required
          onChange={(sectionTitle) => onDiscreteChange({ ...events, content: { ...events.content, sectionTitle } })}
        />
        <SegmentedControl
          label="מספר אירועים מוצגים"
          value={String(events.content.visibleCount) as (typeof VISIBLE_COUNT_OPTIONS)[number]}
          options={VISIBLE_COUNT_OPTIONS}
          labels={{ "1": "1", "2": "2", "3": "3" }}
          onChange={(value) => onDiscreteChange({ ...events, content: { ...events.content, visibleCount: Number(value) as 1 | 2 | 3 } })}
        />
        <ToggleField
          label={'הצגת קישור "לכל האירועים"'}
          checked={events.content.showAllLinkVisible}
          onChange={(showAllLinkVisible) => onDiscreteChange({ ...events, content: { ...events.content, showAllLinkVisible } })}
        />
        {events.content.showAllLinkVisible && (
          <>
            <TextField
              label="טקסט הקישור"
              value={events.content.showAllLinkLabel}
              maxLength={CONTENT_LIMITS.ctaLabel}
              onChange={(showAllLinkLabel) => onDiscreteChange({ ...events, content: { ...events.content, showAllLinkLabel } })}
            />
            <LinkControl
              label={'קישור "לכל האירועים"'}
              value={events.content.showAllLinkHref}
              onChange={(showAllLinkHref) => onDiscreteChange({ ...events, content: { ...events.content, showAllLinkHref } })}
            />
          </>
        )}
        <EditableItemsList
          items={events.content.events}
          minItems={1}
          maxItems={12}
          createItem={(): EventCardContentSettings => ({
            id: `event-${Date.now()}`,
            slug: `event-${Date.now()}`,
            title: "אירוע חדש",
            description: "",
            startDate: "",
            endDate: "",
            displayDay: "1",
            displayMonth: "ינו",
            displayTime: "18:00",
            location: "",
            priceLabel: "",
            calendarUrl: "",
            calendarButtonLabel: "הוסיפו ליומן",
            visible: true,
          })}
          renderItemLabel={(item) => item.title || "(אירוע ללא שם)"}
          getVisible={(item) => item.visible}
          setVisible={(item, visible) => ({ ...item, visible })}
          onChange={updateEvents}
          renderItemFields={(item, update) => (
            <>
              <TextField label="שם האירוע" value={item.title} maxLength={CONTENT_LIMITS.cardTitle} required onChange={(title) => update({ title })} />
              <TextAreaField label="תיאור" value={item.description} maxLength={CONTENT_LIMITS.cardDescription} onChange={(description) => update({ description })} />
              <TextField label="יום בתצוגה (למשל 12)" value={item.displayDay} maxLength={4} required onChange={(displayDay) => update({ displayDay })} />
              <TextField label="חודש בתצוגה (למשל אוג)" value={item.displayMonth} maxLength={8} required onChange={(displayMonth) => update({ displayMonth })} />
              <TextField label="שעה בתצוגה" value={item.displayTime} maxLength={CONTENT_LIMITS.eventTimeLabel} required onChange={(displayTime) => update({ displayTime })} />
              <TextField label="מיקום" value={item.location} maxLength={CONTENT_LIMITS.eventLocation} required onChange={(location) => update({ location })} />
              <TextField label="תאריך התחלה (ISO, למשל 2026-08-12T09:00:00+03:00)" value={item.startDate} maxLength={40} onChange={(startDate) => update({ startDate })} />
              <TextField label="תאריך סיום (ISO, אופציונלי)" value={item.endDate} maxLength={40} onChange={(endDate) => update({ endDate })} />
              <TextField label="מחיר (אופציונלי)" value={item.priceLabel} maxLength={CONTENT_LIMITS.eventTimeLabel} onChange={(priceLabel) => update({ priceLabel })} />
              <LinkControl label="קישור להוספה ליומן" value={item.calendarUrl} onChange={(calendarUrl) => update({ calendarUrl })} />
              <TextField label="טקסט כפתור היומן" value={item.calendarButtonLabel} maxLength={CONTENT_LIMITS.ctaLabel} required onChange={(calendarButtonLabel) => update({ calendarButtonLabel })} />
            </>
          )}
        />
      </>
    );
  }

  if (tab === "design") {
    return (
      <>
        <TokenPicker label="צבע רקע הסקשן" value={events.appearance.sectionBackgroundColorToken} options={COLOR_OPTIONS} onChange={(sectionBackgroundColorToken) => onDiscreteChange({ ...events, appearance: { ...events.appearance, sectionBackgroundColorToken } })} />
        <TokenPicker label="צבע רקע כרטיס" value={events.appearance.cardBackgroundColorToken} options={COLOR_OPTIONS} onChange={(cardBackgroundColorToken) => onDiscreteChange({ ...events, appearance: { ...events.appearance, cardBackgroundColorToken } })} />
        <TokenPicker label="צבע טקסט" value={events.appearance.textColorToken} options={COLOR_OPTIONS} onChange={(textColorToken) => onDiscreteChange({ ...events, appearance: { ...events.appearance, textColorToken } })} />
        <ContrastWarning foreground={events.appearance.textColorToken} background={events.appearance.cardBackgroundColorToken} />
        <TokenPicker label="צבע תג התאריך" value={events.appearance.dateBadgeAccentColorToken} options={COLOR_OPTIONS} onChange={(dateBadgeAccentColorToken) => onDiscreteChange({ ...events, appearance: { ...events.appearance, dateBadgeAccentColorToken } })} />
        <TokenSelect label="עיגול פינות כרטיס" value={events.appearance.cardRadiusToken} options={RADIUS_OPTIONS} labels={RADIUS_LABEL} onChange={(cardRadiusToken) => onDiscreteChange({ ...events, appearance: { ...events.appearance, cardRadiusToken } })} />
        <TokenSelect label="צל כרטיס" value={events.appearance.cardShadowToken} options={SHADOW_OPTIONS} labels={SHADOW_TOKEN_LABEL} onChange={(cardShadowToken) => onDiscreteChange({ ...events, appearance: { ...events.appearance, cardShadowToken } })} />
        <TokenSelect label="סגנון כפתור" value={events.appearance.buttonVariant} options={BUTTON_VARIANT_OPTIONS} labels={BUTTON_VARIANT_LABEL} onChange={(buttonVariant) => onDiscreteChange({ ...events, appearance: { ...events.appearance, buttonVariant } })} />
      </>
    );
  }

  // layout
  return (
    <>
      <SegmentedControl label="עמודות (דסקטופ)" value={String(events.layout.columnsDesktop) as "2" | "3"} options={["2", "3"]} labels={{ "2": "2", "3": "3" }} onChange={(value) => onDiscreteChange({ ...events, layout: { ...events.layout, columnsDesktop: Number(value) as 2 | 3 } })} />
      <SegmentedControl label="עמודות (טאבלט)" value={String(events.layout.columnsTablet) as "1" | "2"} options={["1", "2"]} labels={{ "1": "1", "2": "2" }} onChange={(value) => onDiscreteChange({ ...events, layout: { ...events.layout, columnsTablet: Number(value) as 1 | 2 } })} />
      <TokenSelect label="מרווח בין כרטיסים" value={events.layout.gap} options={SPACING_OPTIONS} labels={SPACING_TOKEN_LABEL} onChange={(gap) => onDiscreteChange({ ...events, layout: { ...events.layout, gap } })} />
      <TokenSelect label="רוחב מקסימלי לתוכן" value={events.layout.containerMaxWidth} options={CONTAINER_WIDTH_OPTIONS} labels={CONTAINER_WIDTH_LABEL} onChange={(containerMaxWidth) => onDiscreteChange({ ...events, layout: { ...events.layout, containerMaxWidth } })} />
      <TokenSelect label="Padding עליון" value={events.layout.sectionPaddingBlock.start} options={SPACING_OPTIONS} labels={SPACING_TOKEN_LABEL} onChange={(start) => onDiscreteChange({ ...events, layout: { ...events.layout, sectionPaddingBlock: { ...events.layout.sectionPaddingBlock, start } } })} />
      <TokenSelect label="Padding תחתון" value={events.layout.sectionPaddingBlock.end} options={SPACING_OPTIONS} labels={SPACING_TOKEN_LABEL} onChange={(end) => onDiscreteChange({ ...events, layout: { ...events.layout, sectionPaddingBlock: { ...events.layout.sectionPaddingBlock, end } } })} />
      <SegmentedControl label="יישור כותרת" value={events.layout.titleAlignment} options={ALIGN_OPTIONS} labels={ALIGN_LABEL} onChange={(titleAlignment) => onDiscreteChange({ ...events, layout: { ...events.layout, titleAlignment } })} />
    </>
  );
}
