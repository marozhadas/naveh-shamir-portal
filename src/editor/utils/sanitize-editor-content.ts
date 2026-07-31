/**
 * Defense in depth for free-text content fields: React already escapes text
 * children (no HTML/script ever executes from these strings), but the editor
 * still refuses to persist markup so pasted rich text can't smuggle tags
 * through into the saved settings object.
 */
export function sanitizeEditorText(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}
