"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import fieldStyles from "@/editor/components/EditorField/EditorField.module.css";
import { getHeroGalleryImagesAction, removeHeroGalleryImageAction, uploadHeroGalleryImageAction } from "@/editor/actions/hero-gallery-actions";
import type { UploadHeroGalleryImageState } from "@/editor/actions/hero-gallery-actions";
import type { HeroGalleryImage } from "@/types/hero-gallery";
import styles from "./HeroGalleryManager.module.css";

const INITIAL_STATE: UploadHeroGalleryImageState = { status: "idle" };

/**
 * Manages the Hero's rotating background gallery — unlike the rest of HeroSettingsPanel (which
 * edits per-browser-local PageEditorState), this reads/writes real Supabase-backed rows through
 * Server Actions, because the whole point is that every visitor sees the same images (spec: "must
 * be live for everyone"), not just the editing admin's own browser.
 */
export function HeroGalleryManager() {
  const [images, setImages] = useState<HeroGalleryImage[] | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [uploadState, uploadAction, isUploading] = useActionState(uploadHeroGalleryImageAction, INITIAL_STATE);

  async function refresh() {
    const next = await getHeroGalleryImagesAction();
    setImages(next);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load of the current gallery on mount, not a prop/state sync
    refresh();
  }, []);

  useEffect(() => {
    if (uploadState.status === "success") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a completed Server Action (external event), not syncing render state
      setFormKey((key) => key + 1);
      refresh();
    }
  }, [uploadState]);

  async function handleRemove(imageId: string) {
    setRemovingId(imageId);
    const result = await removeHeroGalleryImageAction(imageId);
    if (result.success) await refresh();
    setRemovingId(null);
  }

  return (
    <div className={fieldStyles.field}>
      <span className={fieldStyles.label}>תמונות רקע (גלריה מתחלפת)</span>
      <p className={styles.hint}>
        התמונות מוצגות ברקע האזור הראשי לכל מבקרי האתר ומתחלפות אוטומטית. JPG, PNG או WebP, עד 5MB לתמונה. בלי
        תמונות — יוצג הרקע הקבוע.
      </p>

      {images === null ? (
        <p className={styles.hint}>טוען תמונות…</p>
      ) : images.length > 0 ? (
        <ul className={styles.thumbList}>
          {images.map((image) => (
            <li key={image.id} className={styles.thumbItem}>
              {/* Editor-only thumbnail preview, not part of the live site render. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className={styles.thumbImage} />
              <button
                type="button"
                className={styles.removeButton}
                aria-label="הסרת התמונה מהגלריה"
                disabled={removingId === image.id}
                onClick={() => handleRemove(image.id)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>עדיין לא הועלו תמונות.</p>
      )}

      <form key={formKey} action={uploadAction} className={styles.uploadForm}>
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className={styles.fileInput} />
        <input type="text" name="alt" placeholder="תיאור התמונה (לנגישות, לא חובה)" className={fieldStyles.input} maxLength={160} />
        <Button type="submit" variant="accent" size="compact" disabled={isUploading}>
          {isUploading ? "מעלה תמונה…" : "העלאת תמונה"}
        </Button>
      </form>
      {uploadState.status === "error" && (
        <p className={fieldStyles.error} role="alert">
          {uploadState.message}
        </p>
      )}
    </div>
  );
}
