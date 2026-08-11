"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { changeBusinessSlugAction } from "./actions";
import { BUSINESS_SLUG_PATTERN, isValidBusinessSlug, suggestSlugFromEnglishName } from "@/utils/business-slug";
import { SITE_CONFIG } from "@/data/config";
import styles from "./detail.module.css";

type BusinessSlugControlProps = {
  businessId: string;
  businessName: string;
  currentSlug: string;
  /** Whether the business currently has a live public profile (canOpenProfile) — only then does changing the slug risk breaking a real, shared/indexed link, so only then does saving need an extra confirmation step (spec section 9). */
  isLive: boolean;
};

export function BusinessSlugControl({ businessId, businessName, currentSlug, isLive }: BusinessSlugControlProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(currentSlug);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const trimmedValue = value.trim();
  const isCurrentSlugValid = isValidBusinessSlug(currentSlug);
  const isNewValueValid = BUSINESS_SLUG_PATTERN.test(trimmedValue);
  const hasChanged = trimmedValue !== currentSlug;
  const suggestion = suggestSlugFromEnglishName(businessName);

  const previewUrl = useMemo(() => `${SITE_CONFIG.siteUrl}/businesses/${trimmedValue || "…"}`, [trimmedValue]);

  function commitChange() {
    startTransition(async () => {
      const result = await changeBusinessSlugAction({ businessId, newSlug: trimmedValue });
      if (result.status === "success") {
        dialogRef.current?.close();
        setError(null);
        setSuccess(`הכתובת עודכנה ל-${result.newSlug}`);
        router.refresh();
        return;
      }
      dialogRef.current?.close();
      setError(result.message);
    });
  }

  function handleSaveClick() {
    setSuccess(null);
    if (!isNewValueValid) {
      setError("יש להזין כתובת באנגלית בלבד, באותיות קטנות ובמקפים במקום רווחים.");
      return;
    }
    if (!hasChanged) return;
    setError(null);
    if (isLive) {
      dialogRef.current?.showModal();
      return;
    }
    commitChange();
  }

  return (
    <section className={styles.section} aria-labelledby="slug-control-heading">
      <h2 id="slug-control-heading" className={styles.sectionTitle}>
        כתובת URL באנגלית
      </h2>
      <p className={styles.meta}>השם שישמש בכתובת עמוד העסק. יש להזין באנגלית בלבד, באותיות קטנות, ללא רווחים. לדוגמה: ronis-kitchen</p>

      {!isCurrentSlugValid && (
        <p className={styles.emailError} role="alert">
          חסרה כתובת URL תקינה. לפני שהעסק יעבור לחבילת Plus/Premium ויתפרסם, יש להזין כתובת באנגלית כאן.
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="business-slug-input">כתובת URL</label>
        <input
          id="business-slug-input"
          type="text"
          dir="ltr"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
            setSuccess(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby="business-slug-preview business-slug-error"
        />
      </div>
      <p id="business-slug-preview" className={styles.meta} dir="ltr">
        {previewUrl}
      </p>
      {error && (
        <p id="business-slug-error" className={styles.emailError} role="alert">
          {error}
        </p>
      )}
      {success && <p className={styles.meta}>{success}</p>}

      <div className={styles.planButtons}>
        {suggestion && (
          <Button type="button" variant="secondary" size="compact" onClick={() => setValue(suggestion)} disabled={isPending}>
            הצעת כתובת: {suggestion}
          </Button>
        )}
        <Button type="button" variant="accent" size="compact" onClick={handleSaveClick} disabled={isPending || !hasChanged}>
          {isPending ? "שומר…" : "שמירת כתובת"}
        </Button>
      </div>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="slug-dialog-title">
        <div className={styles.dialogBody}>
          <h2 id="slug-dialog-title" className={styles.dialogTitle}>
            שינוי כתובת עמוד העסק
          </h2>
          <p className={styles.dialogText}>שינוי הכתובת ישנה את הקישור הציבורי של העסק. קישורים ישנים עלולים להפסיק לעבוד.</p>
          <div className={styles.dialogActions}>
            <Button type="button" variant="secondary" size="compact" onClick={() => dialogRef.current?.close()} disabled={isPending}>
              ביטול
            </Button>
            <Button type="button" variant="accent" size="compact" onClick={commitChange} disabled={isPending}>
              {isPending ? "משנה…" : "אישור שינוי הכתובת"}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
