"use client";

import { useActionState, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Phone as PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ESSENTIAL_NUMBER_CATEGORY_LABEL, ESSENTIAL_NUMBER_CATEGORY_OPTIONS, ESSENTIAL_NUMBER_ICON_TONE_OPTIONS } from "@/types/essential-number";
import { ESSENTIAL_NUMBER_ICON_LABEL, ESSENTIAL_NUMBER_ICON_MAP, ESSENTIAL_NUMBER_ICON_NAMES } from "@/data/essential-number-icons";
import { ICON_TONE_VARS } from "@/utils/essential-number-icon-tone";
import { saveEssentialNumberAction, uploadEssentialNumberIconAction, type EssentialNumberSaveActionState } from "./actions";
import { EMPTY_ESSENTIAL_NUMBER_FORM_VALUES, type EssentialNumberFormValues } from "./schema";
import type { EssentialNumberRow } from "@/types/essential-number";
import styles from "./essential-numbers-admin.module.css";

function rowToFormValues(entry: EssentialNumberRow): EssentialNumberFormValues {
  return {
    name: entry.name,
    description: entry.description ?? "",
    category: entry.category,
    phone: entry.phone,
    displayPhone: entry.display_phone,
    whatsapp: entry.whatsapp ?? "",
    websiteUrl: entry.website_url ?? "",
    iconType: entry.icon_type,
    iconName: entry.icon_name ?? "",
    iconAlt: entry.icon_alt ?? "",
    iconTone: entry.icon_tone,
    openingHours: entry.opening_hours ?? "",
    notes: entry.notes ?? "",
    priority: String(entry.priority),
    featured: entry.featured,
  };
}

type EssentialNumberFormProps = {
  /** Absent for create, present for edit. */
  entry?: EssentialNumberRow;
};

export function EssentialNumberForm({ entry }: EssentialNumberFormProps) {
  const router = useRouter();
  const boundAction = (prevState: EssentialNumberSaveActionState, formData: FormData) => saveEssentialNumberAction(entry?.id, prevState, formData);
  const initialState: EssentialNumberSaveActionState = { status: "idle", values: entry ? rowToFormValues(entry) : EMPTY_ESSENTIAL_NUMBER_FORM_VALUES };
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const [values, setValues] = useState<EssentialNumberFormValues>(initialState.values);
  const [iconUrl, setIconUrl] = useState(entry?.icon_url ?? "");
  const [iconError, setIconError] = useState("");
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const draftIdRef = useRef<string>(entry?.id ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : "draft"));

  const [previousState, setPreviousState] = useState(state);
  if (previousState !== state) {
    setPreviousState(state);
    if (state.status !== "idle") setValues(state.values);
  }

  const nameId = useId();
  const descId = useId();
  const categoryId = useId();
  const phoneId = useId();
  const displayPhoneId = useId();
  const waId = useId();
  const websiteId = useId();
  const iconAltId = useId();
  const hoursId = useId();
  const notesId = useId();
  const priorityId = useId();

  function fieldError(field: keyof EssentialNumberFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  function updateField<Field extends keyof EssentialNumberFormValues>(field: Field) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = e.target;
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  async function handleIconFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIconError("");
    setIsUploadingIcon(true);
    const result = await uploadEssentialNumberIconAction(draftIdRef.current, file);
    setIsUploadingIcon(false);
    if (!result.success) {
      setIconError(result.message);
      return;
    }
    setIconUrl(result.url);
  }

  const filteredIconNames = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    if (!query) return ESSENTIAL_NUMBER_ICON_NAMES;
    return ESSENTIAL_NUMBER_ICON_NAMES.filter((name) => name.toLowerCase().includes(query) || (ESSENTIAL_NUMBER_ICON_LABEL[name] ?? "").toLowerCase().includes(query));
  }, [iconSearch]);

  const tone = ICON_TONE_VARS[values.iconTone as keyof typeof ICON_TONE_VARS] ?? ICON_TONE_VARS.blue;
  const PreviewIcon = values.iconType === "lucide" ? (ESSENTIAL_NUMBER_ICON_MAP[values.iconName] ?? null) : null;

  if (state.status === "success" && state.savedEntry) {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>{state.savedEntry.status === "published" ? "המספר פורסם בהצלחה!" : "המספר נשמר כטיוטה."}</p>
        <div className={styles.successActions}>
          <Button href="/admin/essential-numbers" variant="secondary">
            חזרה לרשימת המספרים
          </Button>
          {state.savedEntry.status === "published" && (
            <Button href="/essential-numbers" variant="accent" target="_blank" rel="noopener noreferrer">
              צפייה בעמוד הציבורי
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {(state.status === "server-error" || state.status === "validation-error") && state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <input type="hidden" name="iconUrl" value={iconUrl} />
      <input type="hidden" name="previousIconUrl" value={entry?.icon_url ?? ""} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פרטים בסיסיים</h2>
        <div className={`${styles.field} ${fieldError("name") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={nameId}>שם השירות *</label>
          <input id={nameId} name="name" value={values.name} onChange={updateField("name")} aria-invalid={Boolean(fieldError("name"))} />
          {fieldError("name") && <p className={styles.fieldErrorMessage}>{fieldError("name")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("description") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={descId}>תיאור קצר (אופציונלי)</label>
          <input id={descId} name="description" maxLength={300} value={values.description} onChange={updateField("description")} aria-invalid={Boolean(fieldError("description"))} />
          {fieldError("description") && <p className={styles.fieldErrorMessage}>{fieldError("description")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("category") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={categoryId}>קטגוריה *</label>
          <select id={categoryId} name="category" value={values.category} onChange={updateField("category")} aria-invalid={Boolean(fieldError("category"))}>
            <option value="">— בחירת קטגוריה —</option>
            {ESSENTIAL_NUMBER_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {ESSENTIAL_NUMBER_CATEGORY_LABEL[option]}
              </option>
            ))}
          </select>
          {fieldError("category") && <p className={styles.fieldErrorMessage}>{fieldError("category")}</p>}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מספרי קשר</h2>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("phone") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={phoneId}>מספר טלפון (עבור tel:) *</label>
            <input id={phoneId} name="phone" dir="ltr" placeholder="106 או +972500000000" value={values.phone} onChange={updateField("phone")} aria-invalid={Boolean(fieldError("phone"))} />
            {fieldError("phone") && <p className={styles.fieldErrorMessage}>{fieldError("phone")}</p>}
          </div>
          <div className={`${styles.field} ${fieldError("displayPhone") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={displayPhoneId}>
              צורת תצוגה * <span className={styles.hint}>— איך המספר יוצג לציבור</span>
            </label>
            <input id={displayPhoneId} name="displayPhone" dir="ltr" placeholder="106 או 02-9999999" value={values.displayPhone} onChange={updateField("displayPhone")} aria-invalid={Boolean(fieldError("displayPhone"))} />
            {fieldError("displayPhone") && <p className={styles.fieldErrorMessage}>{fieldError("displayPhone")}</p>}
          </div>
        </div>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("whatsapp") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={waId}>וואטסאפ (אופציונלי)</label>
            <input id={waId} name="whatsapp" dir="ltr" placeholder="+972500000000" value={values.whatsapp} onChange={updateField("whatsapp")} aria-invalid={Boolean(fieldError("whatsapp"))} />
            {fieldError("whatsapp") && <p className={styles.fieldErrorMessage}>{fieldError("whatsapp")}</p>}
          </div>
          <div className={`${styles.field} ${fieldError("websiteUrl") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={websiteId}>קישור לאתר (אופציונלי)</label>
            <input id={websiteId} name="websiteUrl" dir="ltr" placeholder="https://..." value={values.websiteUrl} onChange={updateField("websiteUrl")} aria-invalid={Boolean(fieldError("websiteUrl"))} />
            {fieldError("websiteUrl") && <p className={styles.fieldErrorMessage}>{fieldError("websiteUrl")}</p>}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>בחירת אייקון</h2>
        <input type="hidden" name="iconType" value={values.iconType} />
        <input type="hidden" name="iconName" value={values.iconName} />
        <input type="hidden" name="iconTone" value={values.iconTone} />

        <div className={styles.iconTypeToggle} role="group" aria-label="סוג אייקון">
          <button
            type="button"
            className={`${styles.iconTypeButton} ${values.iconType === "lucide" ? styles.iconTypeButtonActive : ""}`}
            onClick={() => setValues((current) => ({ ...current, iconType: "lucide" }))}
          >
            אייקון מובנה
          </button>
          <button
            type="button"
            className={`${styles.iconTypeButton} ${values.iconType === "custom-image" ? styles.iconTypeButtonActive : ""}`}
            onClick={() => setValues((current) => ({ ...current, iconType: "custom-image" }))}
          >
            אייקון מותאם (העלאה)
          </button>
        </div>

        {values.iconType === "lucide" ? (
          <>
            <input
              type="text"
              className={styles.iconSearch}
              placeholder="חיפוש אייקון לפי שם"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              aria-label="חיפוש אייקון"
            />
            <div className={styles.iconGrid} role="listbox" aria-label="בחירת אייקון">
              <button
                type="button"
                role="option"
                className={`${styles.iconOption} ${!values.iconName ? styles.iconOptionActive : ""}`}
                aria-selected={!values.iconName}
                onClick={() => setValues((current) => ({ ...current, iconName: "" }))}
              >
                <span aria-hidden="true">—</span>
                <span className={styles.iconOptionLabel}>ללא אייקון</span>
              </button>
              {filteredIconNames.map((name) => {
                const OptionIcon = ESSENTIAL_NUMBER_ICON_MAP[name];
                const isActive = values.iconName === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    className={`${styles.iconOption} ${isActive ? styles.iconOptionActive : ""}`}
                    aria-selected={isActive}
                    onClick={() => setValues((current) => ({ ...current, iconName: name }))}
                  >
                    <OptionIcon size={20} aria-hidden="true" />
                    <span className={styles.iconOptionLabel}>{ESSENTIAL_NUMBER_ICON_LABEL[name] ?? name}</span>
                    {isActive && <Check size={10} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {fieldError("iconName") && <p className={styles.fieldErrorMessage}>{fieldError("iconName")}</p>}
          </>
        ) : (
          <>
            {iconUrl ? (
              <div className={styles.iconPreviewWrap}>
                <div className={styles.iconPreviewCircle} style={{ background: tone.bg }}>
                  <Image src={iconUrl} alt="" fill sizes="56px" style={{ objectFit: "cover" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label className={styles.uploadTile}>
                    החלפת תמונה
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleIconFileSelect} disabled={isUploadingIcon} className={styles.imageInput} />
                  </label>
                  <Button type="button" variant="secondary" size="compact" onClick={() => setIconUrl("")}>
                    הסרה
                  </Button>
                </div>
              </div>
            ) : (
              <label className={styles.uploadTile}>
                {isUploadingIcon ? "מעלה קובץ…" : "העלאת תמונה (JPG / PNG / WebP)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleIconFileSelect} disabled={isUploadingIcon} className={styles.imageInput} />
              </label>
            )}
            {iconError && <p className={styles.fieldErrorMessage}>{iconError}</p>}
            <div className={`${styles.field} ${fieldError("iconAlt") ? styles.fieldInvalid : ""}`}>
              <label htmlFor={iconAltId}>טקסט חלופי לתמונה (alt) *</label>
              <input id={iconAltId} name="iconAlt" value={values.iconAlt} onChange={updateField("iconAlt")} aria-invalid={Boolean(fieldError("iconAlt"))} />
              {fieldError("iconAlt") && <p className={styles.fieldErrorMessage}>{fieldError("iconAlt")}</p>}
            </div>
          </>
        )}

        <div className={styles.field}>
          <label>צבע האייקון</label>
          <div className={styles.toneRow} role="group" aria-label="צבע האייקון">
            {ESSENTIAL_NUMBER_ICON_TONE_OPTIONS.map((toneOption) => (
              <button
                key={toneOption}
                type="button"
                className={`${styles.toneSwatch} ${values.iconTone === toneOption ? styles.toneSwatchActive : ""}`}
                style={{ background: ICON_TONE_VARS[toneOption].fg }}
                aria-label={toneOption}
                aria-pressed={values.iconTone === toneOption}
                onClick={() => setValues((current) => ({ ...current, iconTone: toneOption }))}
              />
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label>תצוגה מקדימה</label>
          <div className={styles.iconPreviewWrap}>
            <div className={styles.iconPreviewCircle} style={{ background: tone.bg, color: tone.fg }} aria-hidden="true">
              {values.iconType === "custom-image" && iconUrl ? (
                <Image src={iconUrl} alt="" fill sizes="56px" style={{ objectFit: "cover" }} />
              ) : PreviewIcon ? (
                <PreviewIcon size={26} strokeWidth={1.75} />
              ) : (
                <PhoneIcon size={26} strokeWidth={1.75} />
              )}
            </div>
            <span style={{ fontWeight: "var(--fw-bold)" }}>{values.name || "שם השירות"}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מידע נוסף</h2>
        <div className={`${styles.field} ${fieldError("openingHours") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={hoursId}>שעות פעילות (אופציונלי)</label>
          <input id={hoursId} name="openingHours" placeholder="לדוגמה: פעיל 24/7" value={values.openingHours} onChange={updateField("openingHours")} aria-invalid={Boolean(fieldError("openingHours"))} />
          {fieldError("openingHours") && <p className={styles.fieldErrorMessage}>{fieldError("openingHours")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("notes") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={notesId}>הערות (אופציונלי)</label>
          <textarea id={notesId} name="notes" rows={3} maxLength={300} value={values.notes} onChange={updateField("notes")} aria-invalid={Boolean(fieldError("notes"))} />
          {fieldError("notes") && <p className={styles.fieldErrorMessage}>{fieldError("notes")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("priority") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={priorityId}>סדר תצוגה (מספר גבוה יותר = מוצג קודם)</label>
          <input id={priorityId} name="priority" type="number" value={values.priority} onChange={updateField("priority")} aria-invalid={Boolean(fieldError("priority"))} />
          {fieldError("priority") && <p className={styles.fieldErrorMessage}>{fieldError("priority")}</p>}
        </div>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="featured" checked={values.featured} onChange={updateField("featured")} />
          מספר מומלץ (יוצג בעדיפות)
        </label>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={isPending || isUploadingIcon}>
          {isPending ? "שומר…" : "שמירת טיוטה"}
        </Button>
        <Button type="submit" name="intent" value="publish" variant="accent" disabled={isPending || isUploadingIcon}>
          {isPending ? "שומר…" : "פרסום"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => router.push("/admin/essential-numbers")}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
