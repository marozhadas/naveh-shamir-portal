// No `import "server-only"` here, matching marketplace-management-token.ts — pure formatting, no
// secrets of its own, needs to stay importable from a plain vitest unit test.

/** Builds the full, shareable management URL for a raw business token — kept in one place so every caller (admin rotation UI, any future email/WhatsApp share text) formats it identically. */
export function buildBusinessManagementUrl(siteOrigin: string, rawToken: string): string {
  return `${siteOrigin}/business/manage/${rawToken}`;
}
