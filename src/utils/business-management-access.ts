// Pure, no `import "server-only"` — needs to be importable both from server code (the manage page,
// the admin rotation action) and from a plain vitest unit test.
import type { BusinessRegistrationRow } from "@/types/business-registration";

export type BusinessManagementEligibility =
  | { eligible: true }
  | { eligible: false; reason: "not-approved" | "not-premium" | "no-consent" };

type EligibilityInput = Pick<BusinessRegistrationRow, "status" | "active_plan_id" | "dashboard_access_consent">;

/**
 * The single source of truth for "is this business currently allowed to use a self-edit
 * management link" — checked BOTH when an admin generates/rotates a link and, live, every time the
 * link is actually used. A business that had a token issued while Premium but was later downgraded,
 * unapproved, or somehow lost consent must lose edit access immediately, without anyone needing to
 * remember to revoke the token by hand.
 */
export function checkBusinessManagementEligibility(registration: EligibilityInput): BusinessManagementEligibility {
  if (registration.status !== "approved") return { eligible: false, reason: "not-approved" };
  if (registration.active_plan_id !== "premium") return { eligible: false, reason: "not-premium" };
  if (!registration.dashboard_access_consent) return { eligible: false, reason: "no-consent" };
  return { eligible: true };
}

export const BUSINESS_MANAGEMENT_INELIGIBILITY_MESSAGE: Record<Exclude<BusinessManagementEligibility, { eligible: true }>["reason"], string> = {
  "not-approved": "העסק עדיין ממתין לאישור הצוות — הקישור יופעל לאחר האישור.",
  "not-premium": "קישור העריכה העצמית זמין רק לעסקים עם מנוי Premium פעיל.",
  "no-consent": "הגישה לעריכה דרך קישור זה אינה זמינה כרגע. לפרטים נוספים אפשר לפנות להנהלת האתר.",
};
