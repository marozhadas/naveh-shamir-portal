/**
 * Pure username rules for business-owner accounts (profiles.username). English lowercase letters
 * and digits only, single hyphens between groups, 3-30 characters. "Hadas-Design" normalizes to
 * "hadas-design" before either validation or storage — the DB itself also enforces this exact
 * shape via a CHECK constraint, so these two must stay in sync (see create_profiles_table).
 */
const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(normalized: string): boolean {
  return normalized.length >= MIN_LENGTH && normalized.length <= MAX_LENGTH && USERNAME_PATTERN.test(normalized);
}

/** True if `identifier` should be treated as an email address rather than a username (spec: presence of "@" is the sole signal). */
export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes("@");
}
