/**
 * The single reference to "the privacy policy" for consent checkboxes and for what gets stored with
 * a consent. The policy text itself lives at PRIVACY_POLICY_PATH (src/app/privacy/page.tsx) and is
 * NOT written or approved here.
 *
 * PRIVACY_POLICY_VERSION is stored next to every consent (privacy_policy_version), so when the policy
 * changes we can tell which version each person agreed to. Bump it whenever the published policy
 * changes in a way people should re-accept — it is deliberately a plain string, not derived from the
 * page, so the change is an explicit, reviewable decision.
 */
export const PRIVACY_POLICY_PATH = "/privacy";

export const PRIVACY_POLICY_VERSION = "2026-v1";

export const PRIVACY_CONSENT_ERROR = "כדי להמשיך יש לאשר את מדיניות הפרטיות.";

/** What is persisted with a successful, explicit privacy consent. No IP address or user-agent is recorded. */
export type PrivacyConsentRecord = {
  privacy_consent: true;
  privacy_consent_at: string;
  privacy_policy_version: string;
};

export function buildPrivacyConsentRecord(now: Date = new Date()): PrivacyConsentRecord {
  return { privacy_consent: true, privacy_consent_at: now.toISOString(), privacy_policy_version: PRIVACY_POLICY_VERSION };
}
