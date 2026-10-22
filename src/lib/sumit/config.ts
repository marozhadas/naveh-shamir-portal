import "server-only";

/**
 * SUMIT configuration - read ONLY from server environment variables (Vercel -> Project -> Settings -> Environment Variables;
 * never committed, never NEXT_PUBLIC_). Nothing here is set yet; the integration is OFF until the required ones are valid.
 *
 *   SUMIT_COMPANY_ID       (required) the SUMIT company (organization) id - a positive integer.
 *   SUMIT_API_KEY          (required) the API key SECRET. Server-only - it can charge customers.
 *   SUMIT_API_PUBLIC_KEY   (required) the PUBLIC key payments.js runs with in the browser (handed to the form by the server later, not NEXT_PUBLIC_).
 *   SUMIT_ENVIRONMENT      (required) "test" | "production" - which SUMIT organization this deployment is allowed to talk to. No default.
 *   SUMIT_TEST_COMPANY_ID  the CompanyID of the APPROVED test organization (SUMIT's "test track", which has its own organization and
 *                          test terminal). Required when SUMIT_ENVIRONMENT=test.
 *   SUMIT_ALLOW_PRODUCTION must be exactly "true" for SUMIT_ENVIRONMENT=production - a deliberate unlock, so the live organization
 *                          can never be reached by a missing or mistyped variable during the integration stage.
 *   PAYMENTS_PROVIDER      must be "sumit" (see lib/payments/get-payment-provider.ts).
 *   SUMIT_DRY_RUN          (optional) charges are only validated (AuthoriseOnly + DraftDocument), never executed, UNLESS this is exactly
 *                          "false". Unset / anything else = dry run.
 *   SUMIT_TEST_EMAILS      (optional) comma-separated sign-in emails that may use the SUMIT card step of the registration (lib/sumit/registration-access.ts).
 *                          That experiment is limited to this list AND to SUMIT_ENVIRONMENT=test, whatever SUMIT_DRY_RUN says. Empty = nobody.
 *
 * SUMIT_DRY_RUN and SUMIT_ENVIRONMENT are DIFFERENT protections. The dry run only changes what a charge request asks for; it does
 * NOT prove that the organization is the test one. The environment guard is what proves (by configuration) which organization
 * is used: in "test" the configured SUMIT_COMPANY_ID must equal SUMIT_TEST_COMPANY_ID, and in "production" it must not.
 * SUMIT documents no separate sandbox host or API parameter for the test track - the test organization is reached at the same API
 * address with its own CompanyID and keys - so none is invented here; the CompanyID match is the guard.
 *
 * UPAY terminal credentials are NOT needed here: the terminal is linked inside the SUMIT account.
 */

export type SumitEnvironment = "test" | "production";

export type SumitConfig = {
  baseUrl: string;
  companyId: number;
  apiKey: string;
  apiPublicKey: string;
  /** Which organization this deployment is approved to use. */
  environment: SumitEnvironment;
  dryRun: boolean;
  testEmails: string[];
};

export const SUMIT_BASE_URL = "https://api.sumit.co.il";

export const SUMIT_REQUIRED_VARIABLE_NAMES = ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT"] as const;

export function parseSumitCompanyId(value: string | undefined): number | null {
  if (!value || !/^[0-9]{1,15}$/.test(value.trim())) return null;
  const id = Number(value.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function parseSumitEnvironment(value: string | undefined): SumitEnvironment | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "test" || normalized === "production" ? normalized : null;
}

/** The dry run is ON unless the variable is exactly "false" (any case, surrounding spaces ignored). */
export function parseSumitDryRun(value: string | undefined): boolean {
  return value?.trim().toLowerCase() !== "false";
}

export function parseSumitTestEmails(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@")))];
}

export type SumitConfigurationProblem = { variable: string; problem: string };

/** Everything that stops SUMIT from being used, as variable names + a short problem (never a value). Empty = usable. */
export function getSumitConfigurationProblems(): SumitConfigurationProblem[] {
  const problems: SumitConfigurationProblem[] = [];
  const companyId = parseSumitCompanyId(process.env.SUMIT_COMPANY_ID);
  if (companyId === null) problems.push({ variable: "SUMIT_COMPANY_ID", problem: "missing or not a positive integer" });
  if (!process.env.SUMIT_API_KEY?.trim()) problems.push({ variable: "SUMIT_API_KEY", problem: "missing" });
  if (!process.env.SUMIT_API_PUBLIC_KEY?.trim()) problems.push({ variable: "SUMIT_API_PUBLIC_KEY", problem: "missing" });

  const environment = parseSumitEnvironment(process.env.SUMIT_ENVIRONMENT);
  if (environment === null) {
    problems.push({ variable: "SUMIT_ENVIRONMENT", problem: 'missing or not "test" | "production"' });
    return problems;
  }

  const testCompanyId = parseSumitCompanyId(process.env.SUMIT_TEST_COMPANY_ID);
  if (environment === "test") {
    if (testCompanyId === null) problems.push({ variable: "SUMIT_TEST_COMPANY_ID", problem: "missing or not a positive integer (the approved test organization)" });
    else if (companyId !== null && companyId !== testCompanyId) problems.push({ variable: "SUMIT_COMPANY_ID", problem: "is not the approved test organization (SUMIT_TEST_COMPANY_ID)" });
  } else {
    if (process.env.SUMIT_ALLOW_PRODUCTION?.trim() !== "true") problems.push({ variable: "SUMIT_ALLOW_PRODUCTION", problem: 'production is locked: it must be exactly "true"' });
    if (testCompanyId !== null && companyId !== null && companyId === testCompanyId) problems.push({ variable: "SUMIT_COMPANY_ID", problem: "is the approved test organization, which is not allowed in production" });
  }
  return problems;
}

export function getSumitConfig(): SumitConfig | null {
  if (getSumitConfigurationProblems().length > 0) return null;
  const environment = parseSumitEnvironment(process.env.SUMIT_ENVIRONMENT);
  const companyId = parseSumitCompanyId(process.env.SUMIT_COMPANY_ID);
  const apiKey = process.env.SUMIT_API_KEY?.trim();
  const apiPublicKey = process.env.SUMIT_API_PUBLIC_KEY?.trim();
  if (!environment || companyId === null || !apiKey || !apiPublicKey) return null;
  return {
    baseUrl: SUMIT_BASE_URL,
    companyId,
    apiKey,
    apiPublicKey,
    environment,
    dryRun: parseSumitDryRun(process.env.SUMIT_DRY_RUN),
    testEmails: parseSumitTestEmails(process.env.SUMIT_TEST_EMAILS),
  };
}

export function isSumitConfigured(): boolean {
  return getSumitConfig() !== null;
}

/** The names of the variables that stop SUMIT from being used - for an admin-side status line (never the values). */
export function getMissingSumitVariables(): string[] {
  return [...new Set(getSumitConfigurationProblems().map((problem) => problem.variable))];
}

/**
 * Who may use the SUMIT payment step: during the dry run only the listed test emails; after SUMIT_DRY_RUN=false everyone.
 * (Same idea as the PayMe sandbox allowlist. Not wired into any flow yet.)
 */
export function isSumitAvailableForEmail(config: Pick<SumitConfig, "dryRun" | "testEmails">, email: string | null | undefined): boolean {
  if (!config.dryRun) return true;
  return !!email && config.testEmails.includes(email.trim().toLowerCase());
}
