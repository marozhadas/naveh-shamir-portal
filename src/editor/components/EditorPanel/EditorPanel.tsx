"use client";

import { useRef, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useEditorCommands, useEditorState } from "@/editor/context/EditorContext";
import { useEditor } from "@/editor/hooks/use-editor";
import { useFocusTrap } from "@/editor/utils/use-focus-trap";
import { getEditableComponentEntry } from "@/editor/registry/editable-components-registry";
import { settingsPanelComponents } from "@/editor/registry/settings-panel-components";
import { isEditorStateAtDefaults } from "@/editor/config/editor-defaults";
import type { EditorPanelId } from "@/editor/types/editor.types";
import type { SectionKey } from "@/editor/state/editor-actions";
import { EditorHeader } from "@/editor/components/EditorHeader/EditorHeader";
import { EditorToolbar } from "@/editor/components/EditorToolbar/EditorToolbar";
import { EditorTabs } from "@/editor/components/EditorTabs/EditorTabs";
import { EditorConfirmDialog } from "@/editor/components/EditorConfirmDialog/EditorConfirmDialog";
import { PageStructurePanel } from "@/editor/components/PageStructurePanel/PageStructurePanel";
import styles from "./EditorPanel.module.css";

function tabPanelId(tab: EditorPanelId) {
  return `editor-tabpanel-${tab}`;
}

export function EditorPanel() {
  const { selectedRegionId, editorOpen, previewMode, savingStatus, currentState } = useEditorState();
  const { saveNow, resetAll } = useEditorCommands();
  const { resetSection } = useEditor();
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<EditorPanelId>("content");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetSectionConfirmOpen, setResetSectionConfirmOpen] = useState(false);

  useFocusTrap(panelRef, editorOpen && !previewMode);

  const entry = selectedRegionId ? getEditableComponentEntry(selectedRegionId) : null;
  const panels = entry?.panels ?? [];
  const currentTab = panels.includes(activeTab) ? activeTab : panels[0];
  const SettingsPanel = selectedRegionId ? settingsPanelComponents[selectedRegionId] : null;
  const sectionKey = selectedRegionId ? (selectedRegionId.replace("home.", "") as SectionKey) : null;

  const saveDisabled = savingStatus === "saved" || savingStatus === "saving" || savingStatus === "idle";
  const resetDisabled = isEditorStateAtDefaults(currentState);

  return (
    <div ref={panelRef} className={styles.panel} role="region" aria-label="עורך עיצוב עמוד הבית">
      <EditorHeader />
      <EditorToolbar />

      {entry && SettingsPanel && currentTab && sectionKey ? (
        <>
          <EditorTabs panels={panels} activeTab={currentTab} onChange={setActiveTab} tabPanelId={tabPanelId} />
          <div className={styles.content}>
            {panels.map((panel) => (
              <div
                key={panel}
                id={tabPanelId(panel)}
                role="tabpanel"
                aria-labelledby={`editor-tab-${panel}`}
                hidden={panel !== currentTab}
              >
                {panel === currentTab && <SettingsPanel tab={panel} />}
              </div>
            ))}
            {entry.capabilities.resetSection && (
              <Button
                variant="secondary"
                size="compact"
                icon={<RotateCcw size={14} aria-hidden="true" />}
                onClick={() => setResetSectionConfirmOpen(true)}
              >
                איפוס רכיב זה בלבד
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className={styles.content}>
          <PageStructurePanel />
        </div>
      )}

      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="compact"
          icon={<Save size={15} aria-hidden="true" />}
          disabled={saveDisabled}
          onClick={() => void saveNow()}
        >
          שמירת טיוטה
        </Button>
        <Button
          variant="secondary"
          size="compact"
          icon={<RotateCcw size={15} aria-hidden="true" />}
          disabled={resetDisabled}
          onClick={() => setResetConfirmOpen(true)}
        >
          איפוס כל העמוד
        </Button>
      </div>

      <EditorConfirmDialog
        open={resetConfirmOpen}
        title="איפוס כל השינויים?"
        description="הפעולה תמחק את השינויים המקומיים ותחזיר את כל עמוד הבית לעיצוב ברירת המחדל המקורי. אפשר לבטל בכל שלב לפני האישור."
        confirmLabel="איפוס לברירת המחדל"
        onConfirm={() => {
          setResetConfirmOpen(false);
          void resetAll();
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />

      <EditorConfirmDialog
        open={resetSectionConfirmOpen}
        title={`איפוס "${entry?.label ?? ""}"?`}
        description="הפעולה תחזיר את הרכיב הזה בלבד לברירת המחדל שלו. שאר העמוד לא ישתנה. ניתן לבטל באמצעות Ctrl+Z."
        confirmLabel="איפוס הרכיב"
        onConfirm={() => {
          setResetSectionConfirmOpen(false);
          if (sectionKey && entry) resetSection(sectionKey, entry.defaultSettings as never);
        }}
        onCancel={() => setResetSectionConfirmOpen(false)}
      />
    </div>
  );
}
