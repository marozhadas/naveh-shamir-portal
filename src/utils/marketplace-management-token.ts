// No `import "server-only"` here — this file is pure, side-effect-free crypto wrapping with no
// secrets of its own, and needs to be importable from a plain vitest unit test. `node:crypto`
// itself isn't bundleable for the browser, so an accidental client import would already fail at
// build time regardless.
import { generateManagementToken, hashManagementToken } from "./management-token";

export { generateManagementToken, hashManagementToken };

/** Builds the full, shareable management URL for a raw token — kept in one place so every caller (post success screen, WhatsApp share text, admin rotation) formats it identically. */
export function buildManagementUrl(siteOrigin: string, rawToken: string): string {
  return `${siteOrigin}/marketplace/manage/${rawToken}`;
}
