"use client";

import { useState } from "react";
import styles from "./BusinessAbout.module.css";

type BusinessAboutProps = {
  description: string;
  highlights?: string[];
};

const COLLAPSE_THRESHOLD = 320;

export function BusinessAbout({ description, highlights }: BusinessAboutProps) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = description.split(/\n+/).filter(Boolean);
  const isLong = description.length > COLLAPSE_THRESHOLD;

  if (paragraphs.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="about-heading">
      <h2 id="about-heading" className={styles.heading}>
        אודות העסק
      </h2>

      <div className={`${styles.text} ${isLong && !expanded ? styles.collapsed : ""}`}>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {isLong && (
        <button type="button" className={styles.toggle} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          {expanded ? "הצגה מצומצמת" : "קרא עוד"}
        </button>
      )}

      {highlights && highlights.length > 0 && (
        <ul className={styles.highlights}>
          {highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
