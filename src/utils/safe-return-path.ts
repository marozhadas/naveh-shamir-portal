/**
 * Validates a post-login "return to" path before it is ever used in a redirect (the `next` /
 * returnTo value travels through query strings and hidden form fields, so it is user-controlled).
 * Only a same-site path inside the business-owner area is accepted — anything else (absolute URLs,
 * protocol-relative "//host", backslash tricks, other site sections) yields null and the caller
 * falls back to its normal default destination.
 */
const ALLOWED_PREFIX = "/business/";

export function safeReturnPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > 300) return null;
  if (!value.startsWith(ALLOWED_PREFIX)) return null;
  // Control characters, backslashes (browsers treat "\" like "/"), and encoded slashes in the
  // first segment could all be used to smuggle a different destination.
  if (/[\\\u0000-\u001f]/.test(value)) return null;
  if (value.startsWith("/business//")) return null;
  return value;
}

/** Builds `<path>?interval=<monthly|yearly>` for a registration route, preserving the chosen billing track across a login detour. */
export function registrationReturnPath(planId: "plus" | "premium", interval: "monthly" | "yearly"): string {
  return `/business/register/${planId}?interval=${interval}`;
}
