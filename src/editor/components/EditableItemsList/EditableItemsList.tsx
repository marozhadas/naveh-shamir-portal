"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./EditableItemsList.module.css";

function generateItemId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

type EditableItemsListProps<T extends { id: string }> = {
  items: T[];
  minItems: number;
  maxItems: number;
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItemLabel: (item: T, index: number) => string;
  renderItemFields: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  reorderable?: boolean;
  /** When provided, a "מוצג" toggle is rendered per item, guarded so the last visible item can't be hidden. */
  getVisible?: (item: T) => boolean;
  setVisible?: (item: T, visible: boolean) => T;
};

/**
 * Shared item-level CRUD control (spec section 15): add/duplicate/delete/reorder, reused by
 * every section with a repeating list (nav items, quick links, business cards, events, footer
 * links). Guards baked in here apply uniformly across all of them: never below `minItems`,
 * never above `maxItems`, and — when `getVisible` is supplied — never hide the last visible item.
 */
export function EditableItemsList<T extends { id: string }>({
  items,
  minItems,
  maxItems,
  onChange,
  createItem,
  renderItemLabel,
  renderItemFields,
  reorderable = true,
  getVisible,
  setVisible,
}: EditableItemsListProps<T>) {
  const visibleCount = getVisible ? items.filter(getVisible).length : items.length;

  function updateAt(index: number, patch: Partial<T>) {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addItem() {
    if (items.length >= maxItems) return;
    onChange([...items, createItem()]);
  }

  function duplicateAt(index: number) {
    if (items.length >= maxItems) return;
    const source = items[index];
    const copy: T = { ...source, id: generateItemId(source.id) };
    const next = items.slice();
    next.splice(index + 1, 0, copy);
    onChange(next);
  }

  function removeAt(index: number) {
    if (items.length <= minItems) return;
    if (getVisible && getVisible(items[index]) && visibleCount <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }

  function moveBy(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  }

  return (
    <div className={styles.list}>
      {items.map((item, index) => {
        const itemIsLastVisible = getVisible ? getVisible(item) && visibleCount <= 1 : false;
        const removeDisabled = items.length <= minItems || itemIsLastVisible;
        return (
          <details key={item.id} className={styles.item} open={items.length <= 2}>
            <summary className={styles.summary}>{renderItemLabel(item, index)}</summary>
            <div className={styles.itemBody}>
              {getVisible && setVisible && (
                <label className={styles.visibleToggle}>
                  <span>מוצג</span>
                  <input
                    type="checkbox"
                    checked={getVisible(item)}
                    disabled={itemIsLastVisible}
                    title={itemIsLastVisible ? "חייב להישאר לפחות פריט גלוי אחד" : undefined}
                    onChange={(event) => updateAt(index, setVisible(item, event.target.checked))}
                  />
                </label>
              )}
              {renderItemFields(item, (patch) => updateAt(index, patch))}
              <div className={styles.itemActions}>
                {reorderable && (
                  <>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={index === 0}
                      aria-label="הזזת הפריט למעלה"
                      onClick={() => moveBy(index, -1)}
                    >
                      <ChevronUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      disabled={index === items.length - 1}
                      aria-label="הזזת הפריט למטה"
                      onClick={() => moveBy(index, 1)}
                    >
                      <ChevronDown size={15} aria-hidden="true" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={items.length >= maxItems}
                  aria-label="שכפול הפריט"
                  onClick={() => duplicateAt(index)}
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.iconButtonDanger}
                  disabled={removeDisabled}
                  aria-label="מחיקת הפריט"
                  title={
                    itemIsLastVisible
                      ? "לא ניתן למחוק את הפריט הגלוי האחרון"
                      : items.length <= minItems
                        ? `נדרשים לפחות ${minItems} פריטים`
                        : undefined
                  }
                  onClick={() => removeAt(index)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </details>
        );
      })}
      <Button
        variant="secondary"
        size="compact"
        icon={<Plus size={15} aria-hidden="true" />}
        disabled={items.length >= maxItems}
        onClick={addItem}
      >
        הוספת פריט
      </Button>
    </div>
  );
}
