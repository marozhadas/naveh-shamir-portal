/**
 * How a SUMIT TEST organization is recognised, from SUMIT's own documentation (help article 15291230, "test configuration"):
 * "בדיקות" is added to the business name (and shown in red in the business list). That is the only documented marker an API
 * call can read (website/companies/getdetails -> Company.Name). It is a documented signal, not a guarantee: the lab treats a
 * missing marker as a refusal, and never treats the marker alone as permission - the configured CompanyID must ALSO equal the
 * approved test organization (SUMIT_TEST_COMPANY_ID, see config.ts).
 *
 * Pure (no I/O, no secrets) so it can be used from the local lab and tested without a network.
 */
export const SUMIT_TEST_ORGANIZATION_MARKER = "בדיקות";

export function isSumitTestOrganizationName(name: string | null | undefined): boolean {
  return typeof name === "string" && name.includes(SUMIT_TEST_ORGANIZATION_MARKER);
}
