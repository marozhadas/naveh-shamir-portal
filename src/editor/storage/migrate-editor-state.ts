import type { PageEditorState } from "@/editor/schemas/page-editor.schema";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural merge: walks the (v2) `defaults` shape as the authoritative template and fills
 * in from `partial` (the old saved data) wherever a compatible value exists, recursively.
 * Brand-new fields that never existed in v1 (e.g. header.content.navItems) simply have no
 * counterpart in `partial` and fall back to the current default — which is exactly what we
 * want for a genuinely new field. Arrays of objects match old items to their v2 default
 * counterpart by `id` where possible, so per-item new fields (e.g. a business's `visible`)
 * don't leak values from an unrelated item. Never mutates `defaults` or `partial`.
 */
function deepMergeWithDefaults<T>(defaults: T, partial: unknown): T {
  if (Array.isArray(defaults)) {
    if (!Array.isArray(partial) || partial.length === 0) return defaults;
    return partial.map((item) => {
      const itemId = isPlainObject(item) ? item.id : undefined;
      const matchingDefault =
        itemId !== undefined ? defaults.find((entry) => isPlainObject(entry) && entry.id === itemId) : undefined;
      const template = matchingDefault ?? defaults[0];
      return isPlainObject(template) ? deepMergeWithDefaults(template, item) : (item ?? template);
    }) as unknown as T;
  }

  if (isPlainObject(defaults)) {
    const partialObject = isPlainObject(partial) ? partial : {};
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(defaults)) {
      result[key] = deepMergeWithDefaults((defaults as Record<string, unknown>)[key], partialObject[key]);
    }
    return result as T;
  }

  return (partial === undefined ? defaults : partial) as T;
}

/**
 * v1 -> v2: v1 had no `hiddenSections` field and several sections were missing fields that v2
 * requires (header.content.navItems, business/event `visible`, etc.). The merge above fills
 * those in from the current defaults while preserving every v1 value that still has a home in
 * v2's shape (title/description/colors/spacing/... for every section, including Hero).
 */
function migrateV1ToV2(v1: Record<string, unknown>, defaultsV2: PageEditorState): PageEditorState {
  const merged = deepMergeWithDefaults(defaultsV2, v1);
  return {
    ...merged,
    version: 2,
    pageId: "home",
    updatedAt: typeof v1.updatedAt === "string" ? v1.updatedAt : merged.updatedAt,
    hiddenSections: Array.isArray(v1.hiddenSections) ? (v1.hiddenSections as PageEditorState["hiddenSections"]) : [],
  };
}

/**
 * Entry point: returns a v2-shaped candidate for `raw` if it looks like a recognized older
 * version, otherwise returns `raw` untouched (including if it's already v2, or if its shape
 * is unrecognized — the caller validates the result either way, so an unrecognized/corrupt
 * shape still safely falls through to the existing "invalid data" handling).
 */
export function migrateEditorStateIfNeeded(raw: unknown, defaultsV2: PageEditorState): unknown {
  if (!isPlainObject(raw)) return raw;
  if (raw.version === 1) return migrateV1ToV2(raw, defaultsV2);
  return raw;
}
