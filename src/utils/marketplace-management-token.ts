// No `import "server-only"` here (unlike this project's repository/service modules) — this file
// is pure, side-effect-free crypto wrapping with no secrets of its own, and needs to be importable
// from a plain vitest unit test. `node:crypto` itself isn't bundleable for the browser, so an
// accidental client import would already fail at build time regardless.
import { randomBytes, createHash } from "node:crypto";

/**
 * 32 bytes (256 bits) of cryptographically secure randomness, hex-encoded — this is the secret
 * that authorizes managing a marketplace listing with no account/password. Deliberately
 * `randomBytes`, not `Math.random()` (not cryptographically secure) or a plain `crypto.randomUUID()`
 * (122 bits of randomness — far weaker, and UUIDs are sometimes guessable/enumerable by format).
 * The raw value returned here must never be persisted — only its hash (see hashManagementToken)
 * is ever written to the database.
 */
export function generateManagementToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * One-way SHA-256 hash of a raw management token — this is the only form ever stored in
 * marketplace_listings.management_token_hash. Looking up a listing always goes raw token -> hash
 * -> DB equality match; there is no code path that queries by the raw token itself.
 */
export function hashManagementToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Builds the full, shareable management URL for a raw token — kept in one place so every caller (post success screen, WhatsApp share text, admin rotation) formats it identically. */
export function buildManagementUrl(siteOrigin: string, rawToken: string): string {
  return `${siteOrigin}/marketplace/manage/${rawToken}`;
}
