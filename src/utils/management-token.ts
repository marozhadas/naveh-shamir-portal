// No `import "server-only"` here — this file is pure, side-effect-free crypto wrapping with no
// secrets of its own, and needs to be importable from a plain vitest unit test. `node:crypto`
// itself isn't bundleable for the browser, so an accidental client import would already fail at
// build time regardless. Shared by every "secret link, no account" feature in this project
// (marketplace listings, business self-edit) so the actual token generation/hashing rule lives in
// exactly one place.
import { randomBytes, createHash } from "node:crypto";

/**
 * 32 bytes (256 bits) of cryptographically secure randomness, hex-encoded — this is the secret
 * that authorizes managing a resource with no account/password. Deliberately `randomBytes`, not
 * `Math.random()` (not cryptographically secure) or a plain `crypto.randomUUID()` (122 bits of
 * randomness — far weaker, and UUIDs are sometimes guessable/enumerable by format). The raw value
 * returned here must never be persisted — only its hash (see hashManagementToken) is ever written
 * to the database.
 */
export function generateManagementToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * One-way SHA-256 hash of a raw management token — this is the only form ever stored in a
 * `*_management_token_hash` column. Looking up a row always goes raw token -> hash -> DB equality;
 * there is no code path that queries by the raw token itself.
 */
export function hashManagementToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
