import "server-only";

/**
 * SUMIT configuration - read ONLY from server environment variables (Vercel -> Project -> Settings -> Environment Variables;
 * never committed, never NEXT_PUBLIC_). Nothing here is set yet; the integration is OFF until the required ones exist.
 *
 *   SUMIT_COMPANY_ID       (required) the SUMIT company id (a positive integer). Not secret, but kept server-side.
 *   SUMIT_API_KEY          (required) the API key SECRET. Server-only - it can charge customers.
 *   SUMIT_API_PUBLIC_KEY   (required) the PUBLIC key payments.js runs with in the browser. Not used by this module's calls;
 *                          it is the one value a later stage hands to the payment form (as a server prop, not NEXT_PUBLIC_).
 *   PAYMENTS_PROVIDER      "payme" | "sumit" - which provider the app uses. Anything else (or unset) means "payme", so
 *                          the existing PayMe flow stays exactly as it is until this is set to "sumit" on purpose.
 *   SUMIT_DRY_RUN          (optional) charges are only validated (AuthoriseOnly), never executed, UNLESS this is exactly
 *                          "false". Unset / anything else = dry run. The safe default is on purpose.
 *   SUMIT_TEST_EMAILS      (optional) comma-separated sign-in emails that may use the SUMIT payment step while the dry run
 *                          is on. Once SUMIT_DRY_RUN=false everyone may.
 *
 * UPAY terminal credentials are NOT needed here: the terminal is linked inside the SUMIT account.
 */

export type SumitConfig = {
  baseUrl: string;
  companyId: number;
  apiKey: string;
  apiPublicKey: string;
  dryRun: boolean;
  testEmails: string[];
};

export const SUMIT_BASE_URL = "https://api.sumit.co.il";

export const SUMIT_REQUIRED_VARIABLE_NAMES = ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY"] as const;

export function parseSumitCompanyId(value: string | undefined): number | null {
  if (!value || !/^[0-9]{1,15}$/.test(value.trim())) return null;
  const id = Number(value.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** The dry run is ON unless the variable is exactly "false" (any case, surrounding spaces ignored). */
export function parseSumitDryRun(value: string | undefined): boolean {
  return value?.trim().toLowerCase() !== "false";
}

export function parseSumitTestEmails(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@")))];
}

export function getSumitConfig(): SumitConfig | null {
  const companyId = parseSumitCompanyId(process.env.SUMIT_COMPANY_ID);
  const apiKey = process.env.SUMIT_API_KEY?.trim();
  const apiPublicKey = process.env.SUMIT_API_PUBLIC_KEY?.trim();
  if (companyId === null || !apiKey || !apiPublicKey) return null;
  return {
    baseUrl: SUMIT_BASE_URL,
    companyId,
    apiKey,
    apiPublicKey,
    dryRun: parseSumitDryRun(process.env.SUMIT_DRY_RUN),
    testEmails: parseSumitTestEmails(process.env.SUMIT_TEST_EMAILS),
  };
}

export function isSumitConfigured(): boolean {
  return getSumitConfig() !== null;
}

/** The names of the required variables that are still missing / invalid - for an admin-side status line (never the values). */
export function getMissingSumitVariables(): string[] {
  const missing: string[] = [];
  if (parseSumitCompanyId(process.env.SUMIT_COMPANY_ID) === null) missing.push("SUMIT_COMPANY_ID");
  if (!process.env.SUMIT_API_KEY?.trim()) missing.push("SUMIT_API_KEY");
  if (!process.env.SUMIT_API_PUBLIC_KEY?.trim()) missing.push("SUMIT_API_PUBLIC_KEY");
  return missing;
}

/**
 * Who may use the SUMIT payment step: during the dry run only the listed test emails; after SUMIT_DRY_RUN=false everyone.
 * (Same idea as the PayMe sandbox allowlist. Not wired into any flow yet.)
 */
export function isSumitAvailableForEmail(config: Pick<SumitConfig, "dryRun" | "testEmails">, email: string | null | undefined): boolean {
  if (!config.dryRun) return true;
  return !!email && config.testEmails.includes(email.trim().toLowerCase());
}
