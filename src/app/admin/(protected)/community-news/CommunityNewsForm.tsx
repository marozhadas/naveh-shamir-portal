"use client";

import { useActionState, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveCommunityNewsAction, uploadCommunityNewsImageAction, type CommunityNewsSaveActionState } from "./actions";
import { EMPTY_COMMUNITY_NEWS_FORM_VALUES, type CommunityNewsFormValues } from "./schema";
import { slugify } from "@/utils/slugify";
import type { CommunityNewsRow } from "@/types/community-news";
import styles from "./community-news-admin.module.css";

function rowToFormValues(article: CommunityNewsRow): CommunityNewsFormValues {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    body: article.body,
  };
}

type CommunityNewsFormProps = {
  /** Absent for create, present for edit. */
  article?: CommunityNewsRow;
};

export function CommunityNewsForm({ article }: CommunityNewsFormProps) {
  const router = useRouter();
  const boundAction = (prevState: CommunityNewsSaveActionState, formData: FormData) => saveCommunityNewsAction(article?.id, prevState, formData);
  const initialState: CommunityNewsSaveActionState = { status: "idle", values: article ? rowToFormValues(article) : EMPTY_COMMUNITY_NEWS_FORM_VALUES };
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const [values, setValues] = useState<CommunityNewsFormValues>(initialState.values);
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [imageUrl, setImageUrl] = useState(article?.image_url ?? "");
  const [imageAlt, setImageAlt] = useState(article?.image_alt ?? "");
  const [imageError, setImageError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const draftIdRef = useRef<string>(article?.id ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : "draft"));

  const [previousState, setPreviousState] = useState(state);
  if (previousState !== state) {
    setPreviousState(state);
    if (state.status !== "idle") setValues(state.values);
  }

  const titleId = useId();
  const slugId = useId();
  const excerptId = useId();
  const bodyId = useId();

  function fieldError(field: keyof CommunityNewsFormValues): string | undefined {
    return state.status === "validation-error" ? state.fieldErrors?.[field]?.[0] : undefined;
  }

  function updateField<Field extends keyof CommunityNewsFormValues>(field: Field) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: e.target.value }));
    };
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setValues((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError("");
    setIsUploadingImage(true);
    const result = await uploadCommunityNewsImageAction(draftIdRef.current, file);
    setIsUploadingImage(false);
    if (!result.success) {
      setImageError(result.message);
      return;
    }
    setImageUrl(result.url);
    if (!imageAlt) setImageAlt(values.title);
  }

  if (state.status === "success" && state.savedArticle) {
    return (
      <div className={styles.successBox} role="status">
        <p className={styles.successTitle}>{state.savedArticle.status === "published" ? "הכתבה פורסמה בהצלחה!" : "הכתבה נשמרה כטיוטה."}</p>
        <div className={styles.successActions}>
          <Button href="/admin/community-news" variant="secondary">
            חזרה לרשימת הכתבות
          </Button>
          {state.savedArticle.status === "published" && (
            <Button href={`/news/${state.savedArticle.slug}`} variant="accent" target="_blank" rel="noopener noreferrer">
              צפייה בכתבה
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.status === "server-error" && state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      {state.status === "validation-error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="imageAlt" value={imageAlt} />
      <input type="hidden" name="previousImageUrl" value={article?.image_url ?? ""} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>פרטי הכתבה</h2>
        <div className={`${styles.field} ${fieldError("title") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={titleId}>כותרת *</label>
          <input id={titleId} name="title" value={values.title} onChange={handleTitleChange} aria-invalid={Boolean(fieldError("title"))} />
          {fieldError("title") && <p className={styles.fieldErrorMessage}>{fieldError("title")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("slug") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={slugId}>
            Slug (כתובת) * <span className={styles.hint}>— אוטומטי מהכותרת, ניתן לעריכה</span>
          </label>
          <input
            id={slugId}
            name="slug"
            dir="ltr"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              updateField("slug")(e);
            }}
            aria-invalid={Boolean(fieldError("slug"))}
          />
          {fieldError("slug") && <p className={styles.fieldErrorMessage}>{fieldError("slug")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("excerpt") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={excerptId}>
            תקציר * <span className={styles.hint}>— זה מה שיוצג בעמוד הבית</span>
          </label>
          <textarea id={excerptId} name="excerpt" rows={2} maxLength={220} value={values.excerpt} onChange={updateField("excerpt")} aria-invalid={Boolean(fieldError("excerpt"))} />
          {fieldError("excerpt") && <p className={styles.fieldErrorMessage}>{fieldError("excerpt")}</p>}
        </div>
        <div className={`${styles.field} ${fieldError("body") ? styles.fieldInvalid : ""}`}>
          <label htmlFor={bodyId}>גוף הכתבה *</label>
          <textarea id={bodyId} name="body" rows={10} maxLength={5000} value={values.body} onChange={updateField("body")} aria-invalid={Boolean(fieldError("body"))} />
          {fieldError("body") && <p className={styles.fieldErrorMessage}>{fieldError("body")}</p>}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>תמונה</h2>
        {imageUrl ? (
          <div className={styles.imagePreviewWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element -- transient preview thumbnail during upload flow */}
            <img src={imageUrl} alt={imageAlt || "תצוגה מקדימה"} className={styles.imagePreview} />
            <div className={styles.imagePreviewActions}>
              <label className={styles.replaceButton}>
                החלפת תמונה
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} disabled={isUploadingImage} className={styles.imageInput} />
              </label>
              <Button type="button" variant="secondary" size="compact" onClick={() => setImageUrl("")}>
                הסרה
              </Button>
            </div>
          </div>
        ) : (
          <label className={styles.uploadTile}>
            {isUploadingImage ? "מעלה תמונה…" : "העלאת תמונה (JPG / PNG / WebP)"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} disabled={isUploadingImage} className={styles.imageInput} />
          </label>
        )}
        {imageUrl && (
          <div className={styles.field}>
            <label>טקסט חלופי לתמונה (alt)</label>
            <input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
          </div>
        )}
        {imageError && <p className={styles.fieldErrorMessage}>{imageError}</p>}
      </section>

      <div className={styles.formActions}>
        <Button type="submit" name="intent" value="draft" variant="secondary" disabled={isPending || isUploadingImage}>
          {isPending ? "שומר…" : "שמירת טיוטה"}
        </Button>
        <Button type="submit" name="intent" value="publish" variant="accent" disabled={isPending || isUploadingImage}>
          {isPending ? "שומר…" : "פרסום הכתבה"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => router.push("/admin/community-news")}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
