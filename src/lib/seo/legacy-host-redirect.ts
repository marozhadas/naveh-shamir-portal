/**
 * One permanent (308) redirect from the project's fixed Vercel production domain to the official domain, so the same
 * site is not served (and indexed) under two hosts.
 *
 * Deliberately NOT a wildcard on *.vercel.app: the match is the exact host below and nothing else, so Preview and
 * branch deployments (naveh-shamir-portal-<hash>-<team>.vercel.app, naveh-shamir-portal-git-<branch>-<team>.vercel.app),
 * localhost, any future staging host and the official domain itself are never redirected (and the official domain
 * can therefore never loop).
 *
 * Path and query string are preserved (Next passes the query through on redirects). One path is left out on purpose:
 * /api/webhooks/ — a payment provider POSTing a callback to the old host must not be bounced to another host, because
 * webhook senders commonly do not follow redirects. No browser or crawler visits it.
 *
 * Plain data + one pure function, no imports: it is read by next.config.ts (which runs before the app's module graph
 * exists) and unit-tested directly.
 */

/** The only host that is redirected. */
export const LEGACY_VERCEL_PRODUCTION_HOST = "naveh-shamir-portal.vercel.app";

/** Paths that must keep answering on the legacy host (see above). */
export const LEGACY_HOST_PASSTHROUGH_PREFIX = "api/webhooks/";

export type LegacyHostRedirect = {
  source: string;
  has: { type: "host"; value: string }[];
  destination: string;
  permanent: true;
};

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `officialOrigin` is SITE_CONFIG.siteUrl, e.g. "https://neveshamir.co.il" (no trailing slash needed). */
export function buildLegacyHostRedirects(officialOrigin: string): LegacyHostRedirect[] {
  const origin = officialOrigin.replace(/\/+$/, "");
  const has = [{ type: "host" as const, value: escapeForRegex(LEGACY_VERCEL_PRODUCTION_HOST) }];
  return [
    // the home page ("/" has no path segment to capture)
    { source: "/", has, destination: `${origin}/`, permanent: true },
    // every other path, except the webhook prefix; the query string rides along automatically
    { source: `/:path((?!${LEGACY_HOST_PASSTHROUGH_PREFIX}).+)`, has, destination: `${origin}/:path`, permanent: true },
  ];
}

/** Pure mirror of the rule's host condition (Next anchors a `has` host value as a whole-string regex). */
export function isLegacyVercelProductionHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0].toLowerCase();
  return hostname === LEGACY_VERCEL_PRODUCTION_HOST;
}
