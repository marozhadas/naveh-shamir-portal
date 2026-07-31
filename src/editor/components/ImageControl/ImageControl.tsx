"use client";

import { useId } from "react";
import { SegmentedControl } from "@/editor/components/TokenPicker/SegmentedControl";
import fieldStyles from "@/editor/components/EditorField/EditorField.module.css";
import styles from "./ImageControl.module.css";
import type { EditableImage } from "@/editor/types/editor.types";

type ImageControlProps = {
  label: string;
  value: EditableImage;
  onChange: (next: EditableImage) => void;
};

function isValidImageSrc(value: string): boolean {
  return (value.startsWith("https://") || value.startsWith("/")) && !value.startsWith("data:");
}

const OBJECT_FIT_LABELS = { cover: "מילוי (cover)", contain: "הכלה (contain)" } as const;

/**
 * Image swapping is URL-only (spec exclusion: no real file upload) — the field
 * accepts an https:// link or a local /path, mirroring editableImageSchema exactly.
 */
export function ImageControl({ label, value, onChange }: ImageControlProps) {
  const srcId = useId();
  const altId = useId();
  const srcHasValue = value.src.trim().length > 0;
  const srcInvalid = srcHasValue && !isValidImageSrc(value.src);

  return (
    <div className={fieldStyles.field}>
      <span className={fieldStyles.label}>{label}</span>
      <div className={styles.preview}>
        {isValidImageSrc(value.src) ? (
          // Editor-only preview thumbnail (not part of the live site render) — a plain <img> is fine here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.src} alt="" className={styles.previewImage} style={{ objectFit: value.objectFit }} />
        ) : (
          <span className={styles.previewEmpty}>אין תצוגה מקדימה</span>
        )}
      </div>

      <label htmlFor={srcId} className={fieldStyles.label}>
        קישור לתמונה
      </label>
      <input
        id={srcId}
        type="text"
        dir="ltr"
        className={fieldStyles.input}
        value={value.src}
        placeholder="https://... או /images/..."
        onChange={(event) => onChange({ ...value, src: event.target.value })}
      />
      {srcInvalid && (
        <span className={fieldStyles.error}>הקישור חייב להתחיל ב-https:// או בנתיב מקומי שמתחיל ב-/</span>
      )}

      <label htmlFor={altId} className={fieldStyles.label}>
        טקסט חלופי (alt)
      </label>
      <input
        id={altId}
        type="text"
        className={fieldStyles.input}
        value={value.alt}
        maxLength={160}
        onChange={(event) => onChange({ ...value, alt: event.target.value })}
      />

      <SegmentedControl
        label="התאמת תמונה"
        value={value.objectFit}
        options={["cover", "contain"] as const}
        labels={OBJECT_FIT_LABELS}
        onChange={(objectFit) => onChange({ ...value, objectFit })}
      />
    </div>
  );
}
