"use client";

import { useActionState, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { WHATSAPP_GROUP_CATEGORY_LABEL, WHATSAPP_GROUP_CATEGORY_OPTIONS } from "@/types/whatsapp-group";
import { WHATSAPP_GROUP_ICON_LABEL, WHATSAPP_GROUP_ICON_MAP, WHATSAPP_GROUP_ICON_NAMES } from "@/data/whatsapp-group-icons";
import { saveWhatsAppGroupAction, uploadWhatsAppGroupIconAction, type WhatsAppGroupSaveActionState } from "./actions";
import { EMPTY_WHATSAPP_GROUP_FORM_VALUES, type WhatsAppGroupFormValues } from "./schema";
import type { WhatsAppGroupRow } from "@/types/whatsapp-group";
import styles from "./whatsapp-groups-admin.module.css";

function rowToFormValues(entry: WhatsAppGroupRow): WhatsAppGroupFormValues {
  return {
    name: entry.name,
    description: entry.description ?? "",
    category: entry.category,
    inviteUrl: entry.invite_url,
    audience: entry.audience.join(", "),
    areaOrStreet: entry.area_or_street ?? "",
    iconType: entry.icon_type,
    iconName: entry.icon_name ?? "",
    iconAlt: entry.icon_alt ?? "",
    rulesOrNotes: entry.rules_or_notes ?? "",
    adminContactName: entry.admin_contact_name ?? "",
    priority: String(entry.priority),
    featured: entry.featured,
  };
}

type WhatsAppGroupFormProps = {
  /** Absent for create, present for edit. */
  entry?: WhatsAppGroupRow;
};

export function WhatsAppGroupForm({ entry }: WhatsAppGroupFormProps) {
  const router = useRouter();
  const boundAction = (prevState: WhatsAppGroupSaveActionState, formData: FormData) => saveWhatsAppGroupAction(entry?.id, prevState, formData);
  const initialState: WhatsAppGroupSaveActionState = { status: "idle", values: entry ? rowToFormValues(entry) : EMPTY_WHATSAPP_GROUP_FORM_VALUES };
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const [values, setValues] = useState<WhatsAppGroupFormValues>(initialState.values);
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
  const inviteUrlId = useId();
  const audienceId = useId();
  const areaId = useId();
  const iconAltId = useId();
  const rulesId = useId();
  const contactNameId = useId();
  const priorityId = useId();

  function fieldError(field: keyof WhatsAppGroupFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  function updateField<Field extends keyof WhatsAppGroupFormValues>(field: Field) {
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
    const result = await uploadWhatsAppGroupIconAction(draftIdRef.current, file);
    setIsUploadingIcon(false);
    if (!result.success) {
      setIconError(result.message);
      return;
    }
    setIconUrl(result.url);
  }

  const filteredIconNames = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    if (!query) return WHATSAPP_GROUP_ICON_NAMES;
    return WHATSAPP_GROUP_ICON_NAMES.filter((name) => name.toLowerCase().includes(query) || (WHATSAPP_GROUP_ICON_LABEL[name] ?? "").toLowerCase().includes(query));
  }, [iconSearch]);

  const PreviewIcon = values.iconType === "lucide" ? (WHATSAPP_GROUP_ICON_MAP[values.iconName] ?? null) : null;

  if (state.status === "success" && state.savedGroup) {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>{state.savedGroup.status === "published" ? "הקבוצה פורסמה בהצלחה!" : "הקבוצה נשמרה כטיוטה."}</p>
        <div className={styles.successActions}>
          <Button href="/admin/whatsapp-groups" variant="secondary">
            חזרה לרשימת הקבוצות
          </Button>
          {state.savedGroup.status === "published" && (
            <Button href="/essential-numbers#whatsapp-groups" variant="accent" target="_blank" rel="noopener noreferrer">
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
          <label htmlFor={nameId}>שם הקבוצה *</label>
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
            {WHATSAPP_GROUP_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {WHATSAPP_GROUP_CATEGORY_LABEL[option]}
              </option>
            ))}
          </select>
          {fieldError("category") && <p className={styles.fieldErrorMessage}>{fieldError("category")}</p>}
        </div>
        <div className={styles.row}>
          <div className={`${styles.field} ${fieldError("audience") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={audienceId}>
              למי הקבוצה מיועדת <span className={styles.hint}>— אופציונלי, מופרד בפסיקים</span>
            </label>
            <input id={audienceId} name="audience" placeholder="הורים, תושבי הרחוב" value={values.audience} onChange={updateField("audience")} aria-invalid={Boolean(fieldError("audience"))} />
            {fieldError("audience") && <p className={styles.fieldErrorMessage}>{fieldError("audience")}</p>}
          </div>
          <div className={`${styles.field} ${fieldError("areaOrStreet") ? styles.fieldInvalid : ""}`}>
            <label htmlFor={areaId}>רחוב, בניין או אזור (אופציונלי)</label>
            <input id={areaId} name="areaOrStreet" value={values.areaOrStreet} onChange={updateField("areaOrStreet")} aria-invalid={Boolean(fieldError("areaOrStreet"))} />
            {fieldError("areaOrStreet") && <p className={styles.fieldErrorMessage}>{fieldError("areaOrStreet")}</p>}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>קישור הצטרפות</h2>
        <div className={`${styles.field} ${fieldError("inviteUrl") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={inviteUrlId}>קישור הצטרפות ל-WhatsApp *</label>
          <input
            id={inviteUrlId}
            name="inviteUrl"
            dir="ltr"
            placeholder="https://chat.whatsapp.com/..."
            value={values.inviteUrl}
            onChange={updateField("inviteUrl")}
            aria-invalid={Boolean(fieldError("inviteUrl"))}
          />
          {fieldError("inviteUrl") && <p className={styles.fieldErrorMessage}>{fieldError("inviteUrl")}</p>}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>בחירת אייקון</h2>
        <input type="hidden" name="iconType" value={values.iconType} />
        <input type="hidden" name="iconName" value={values.iconName} />

        <div className={styles.iconTypeToggle} role="group" aria-label="סוג אייקון">
          <button
            type="button"
            className={`${styles.iconTypeButton} ${values.iconType === "whatsapp" ? styles.iconTypeButtonActive : ""}`}
            onClick={() => setValues((current) => ({ ...current, iconType: "whatsapp" }))}
          >
            אייקון WhatsApp
          </button>
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

        {values.iconType === "lucide" && (
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
                const OptionIcon = WHATSAPP_GROUP_ICON_MAP[name];
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
                    <span className={styles.iconOptionLabel}>{WHATSAPP_GROUP_ICON_LABEL[name] ?? name}</span>
                    {isActive && <Check size={10} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {fieldError("iconName") && <p className={styles.fieldErrorMessage}>{fieldError("iconName")}</p>}
          </>
        )}

        {values.iconType === "custom-image" && (
          <>
            {iconUrl ? (
              <div className={styles.iconPreviewWrap}>
                <div className={styles.iconPreviewCircle}>
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
          <label>תצוגה מקדימה</label>
          <div className={styles.iconPreviewWrap}>
            <div className={styles.iconPreviewCircle} aria-hidden="true">
              {values.iconType === "custom-image" && iconUrl ? (
                <Image src={iconUrl} alt="" fill sizes="56px" style={{ objectFit: "cover" }} />
              ) : values.iconType === "lucide" && PreviewIcon ? (
                <PreviewIcon size={26} strokeWidth={1.75} />
              ) : (
                <WhatsAppIcon size={30} aria-hidden="true" />
              )}
            </div>
            <span style={{ fontWeight: "var(--fw-bold)" }}>{values.name || "שם הקבוצה"}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>מידע נוסף</h2>
        <div className={`${styles.field} ${fieldError("rulesOrNotes") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={rulesId}>כללי הקבוצה / הערות (אופציונלי)</label>
          <textarea id={rulesId} name="rulesOrNotes" rows={3} maxLength={600} value={values.rulesOrNotes} onChange={updateField("rulesOrNotes")} aria-invalid={Boolean(fieldError("rulesOrNotes"))} />
          {fieldError("rulesOrNotes") && <p className={styles.fieldErrorMessage}>{fieldError("rulesOrNotes")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("adminContactName") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={contactNameId}>שם מנהל/ת הקבוצה (אופציונלי)</label>
          <input
            id={contactNameId}
            name="adminContactName"
            value={values.adminContactName}
            onChange={updateField("adminContactName")}
            aria-invalid={Boolean(fieldError("adminContactName"))}
          />
          {fieldError("adminContactName") && <p className={styles.fieldErrorMessage}>{fieldError("adminContactName")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("priority") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={priorityId}>סדר תצוגה (מספר גבוה יותר = מוצג קודם)</label>
          <input id={priorityId} name="priority" type="number" value={values.priority} onChange={updateField("priority")} aria-invalid={Boolean(fieldError("priority"))} />
          {fieldError("priority") && <p className={styles.fieldErrorMessage}>{fieldError("priority")}</p>}
        </div>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="featured" checked={values.featured} onChange={updateField("featured")} />
          קבוצה מומלצת (תוצג בעדיפות)
        </label>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={isPending || isUploadingIcon}>
          {isPending ? "שומר…" : "שמירת טיוטה"}
        </Button>
        <Button type="submit" name="intent" value="publish" variant="accent" disabled={isPending || isUploadingIcon}>
          {isPending ? "שומר…" : "פרסום"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => router.push("/admin/whatsapp-groups")}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
