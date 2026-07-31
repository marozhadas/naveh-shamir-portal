"use client";

import { Check } from "lucide-react";
import type { ColorToken } from "@/editor/types/editor.types";
import { COLOR_TOKEN_HEX, COLOR_TOKEN_LABEL } from "@/editor/config/editor-constants";
import styles from "./TokenPicker.module.css";

type TokenPickerProps = {
  label: string;
  value: ColorToken;
  options: ColorToken[];
  onChange: (value: ColorToken) => void;
};

/**
 * Reusable color token picker (spec section 23): shows a swatch, the token
 * name, and a read-only hex value; never accepts a free/custom color.
 */
export function TokenPicker({ label, value, options, onChange }: TokenPickerProps) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.grid} role="radiogroup" aria-label={label}>
        {options.map((token) => {
          const selected = token === value;
          return (
            <button
              key={token}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`${styles.swatchButton} ${selected ? styles.swatchButtonSelected : ""}`}
              onClick={() => onChange(token)}
            >
              <span className={styles.swatch} style={{ background: COLOR_TOKEN_HEX[token] }} aria-hidden="true" />
              <span className={styles.swatchName}>
                {selected && <Check size={10} className={styles.checkMark} aria-hidden="true" />} {COLOR_TOKEN_LABEL[token]}
              </span>
              <span className={styles.swatchHex}>{COLOR_TOKEN_HEX[token]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
