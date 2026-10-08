import { describe, expect, it } from "vitest";
import { PRIVACY_CONSENT_ERROR, PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION, buildPrivacyConsentRecord } from "./privacy-policy";

describe("privacy consent record", () => {
  it("stores whether, when and which policy version — and nothing else (no IP / user-agent)", () => {
    const record = buildPrivacyConsentRecord(new Date("2026-10-08T10:00:00.000Z"));
    expect(record).toEqual({ privacy_consent: true, privacy_consent_at: "2026-10-08T10:00:00.000Z", privacy_policy_version: PRIVACY_POLICY_VERSION });
    expect(Object.keys(record).sort()).toEqual(["privacy_consent", "privacy_consent_at", "privacy_policy_version"]);
  });

  it("points at the existing /privacy page and uses the required error wording", () => {
    expect(PRIVACY_POLICY_PATH).toBe("/privacy");
    expect(PRIVACY_CONSENT_ERROR).toBe("כדי להמשיך יש לאשר את מדיניות הפרטיות.");
  });
});
