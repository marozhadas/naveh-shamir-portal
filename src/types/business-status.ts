/**
 * The business's explicit publication state — never inferred from a single boolean. A business
 * can be `visible: true` in the flat archive sense yet still not belong in public listings if
 * it's e.g. `suspended`, so page/archive code must check `status`, not just `visible`.
 */
export type BusinessPublicationStatus = "draft" | "pending-review" | "published" | "suspended" | "archived";

export const PUBLIC_BUSINESS_STATUSES: BusinessPublicationStatus[] = ["published"];

export function isPubliclyVisibleStatus(status: BusinessPublicationStatus): boolean {
  return status === "published";
}
