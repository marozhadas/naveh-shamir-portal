"use client";

import { useRef } from "react";
import type { EditorPanelId } from "@/editor/types/editor.types";
import styles from "./EditorTabs.module.css";

const PANEL_LABEL: Record<EditorPanelId, string> = {
  content: "תוכן",
  design: "עיצוב",
  layout: "פריסה",
  responsive: "רספונסיביות",
  advanced: "מתקדם",
};

type EditorTabsProps = {
  panels: EditorPanelId[];
  activeTab: EditorPanelId;
  onChange: (tab: EditorPanelId) => void;
  tabPanelId: (tab: EditorPanelId) => string;
};

export function EditorTabs({ panels, activeTab, onChange, tabPanelId }: EditorTabsProps) {
  const tabsRef = useRef<Map<EditorPanelId, HTMLButtonElement>>(new Map());

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    // RTL layout: ArrowLeft moves to the visually-next (= array-next) tab, ArrowRight to previous.
    let nextIndex: number | null = null;
    if (event.key === "ArrowLeft") nextIndex = (index + 1) % panels.length;
    else if (event.key === "ArrowRight") nextIndex = (index - 1 + panels.length) % panels.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = panels.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = panels[nextIndex];
    onChange(nextTab);
    tabsRef.current.get(nextTab)?.focus();
  }

  return (
    <div className={styles.tablist} role="tablist" aria-label="הגדרות עריכה">
      {panels.map((panel, index) => (
        <button
          key={panel}
          ref={(el) => {
            if (el) tabsRef.current.set(panel, el);
          }}
          type="button"
          role="tab"
          id={`editor-tab-${panel}`}
          aria-selected={activeTab === panel}
          aria-controls={tabPanelId(panel)}
          tabIndex={activeTab === panel ? 0 : -1}
          className={`${styles.tab} ${activeTab === panel ? styles.tabActive : ""}`}
          onClick={() => onChange(panel)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {PANEL_LABEL[panel]}
        </button>
      ))}
    </div>
  );
}
