import { describe, expect, it } from "vitest";
// @ts-expect-error -- Next's bundled path-to-regexp (the matcher Next itself uses for redirect sources) ships no types
import { match } from "next/dist/compiled/path-to-regexp";
import { LEGACY_VERCEL_PRODUCTION_HOST, buildLegacyHostRedirects, isLegacyVercelProductionHost } from "./legacy-host-redirect";
import { SITE_CONFIG } from "@/data/config";

/**
 * Evaluates the generated rules the way Next.js does (host condition anchored as a whole-string regex, `source`
 * matched with path-to-regexp, destination compiled from the captured params, query string passed through). The same
 * behaviour is also proven against the real Next.js runtime (production build, requests with a Host header) — see the
 * task report.
 */
function redirectFor(host: string, pathAndQuery: string): { status: 308; location: string } | null {
  const rules = buildLegacyHostRedirects(SITE_CONFIG.siteUrl);
  const url = new URL(pathAndQuery, "http://placeholder.invalid");
  const hostname = host.split(":")[0];
  for (const rule of rules) {
    const hostMatches = rule.has.every((condition) => new RegExp(`^${condition.value}$`).test(hostname));
    if (!hostMatches) continue;
    const matched = match(rule.source)(url.pathname);
    if (!matched) continue;
    const params = matched.params as Record<string, string>;
    const destination = rule.destination.replace(":path", params.path ?? "");
    return { status: 308, location: `${destination}${url.search}` };
  }
  return null;
}

describe("legacy Vercel host redirect", () => {
  it("the official domain is the redirect target, taken from SITE_CONFIG", () => {
    expect(SITE_CONFIG.siteUrl).toBe("https://neveshamir.co.il");
    for (const rule of buildLegacyHostRedirects(SITE_CONFIG.siteUrl)) expect(rule.destination.startsWith("https://neveshamir.co.il/")).toBe(true);
  });

  it("is permanent (308) and conditioned on exactly one host, never a wildcard on *.vercel.app", () => {
    for (const rule of buildLegacyHostRedirects(SITE_CONFIG.siteUrl)) {
      expect(rule.permanent).toBe(true);
      expect(rule.has).toHaveLength(1);
      expect(rule.has[0].type).toBe("host");
      expect(rule.has[0].value).toBe("naveh-shamir-portal\\.vercel\\.app");
      expect(rule.has[0].value).not.toMatch(/\*|\.\+|\.\*|\(\?:|\|/);
    }
  });

  it("production Vercel host → 308 to the official domain, path preserved", () => {
    const host = LEGACY_VERCEL_PRODUCTION_HOST;
    expect(redirectFor(host, "/")).toEqual({ status: 308, location: "https://neveshamir.co.il/" });
    expect(redirectFor(host, "/businesses")).toEqual({ status: 308, location: "https://neveshamir.co.il/businesses" });
    expect(redirectFor(host, "/businesses/foo")).toEqual({ status: 308, location: "https://neveshamir.co.il/businesses/foo" });
    expect(redirectFor(host, "/business/dashboard")).toEqual({ status: 308, location: "https://neveshamir.co.il/business/dashboard" });
    expect(redirectFor(host, "/auth/callback")).toEqual({ status: 308, location: "https://neveshamir.co.il/auth/callback" });
  });

  it("query string is preserved", () => {
    const host = LEGACY_VERCEL_PRODUCTION_HOST;
    expect(redirectFor(host, "/news/article?x=1")).toEqual({ status: 308, location: "https://neveshamir.co.il/news/article?x=1" });
    expect(redirectFor(host, "/businesses?cat=food&page=2")?.location).toBe("https://neveshamir.co.il/businesses?cat=food&page=2");
    expect(redirectFor(host, "/?ref=a")?.location).toBe("https://neveshamir.co.il/?ref=a");
  });

  it("Preview and branch deployments are NOT redirected", () => {
    for (const host of [
      "naveh-shamir-portal-q2ryzewyn-marozhadas-projects.vercel.app", // immutable deployment URL
      "naveh-shamir-portal-git-feature-x-marozhadas-projects.vercel.app", // branch preview
      "naveh-shamir-portal-marozhadas-projects.vercel.app", // another project-level alias
      "other-project.vercel.app",
    ]) {
      expect(redirectFor(host, "/businesses"), host).toBeNull();
      expect(redirectFor(host, "/"), host).toBeNull();
    }
  });

  it("lookalike hosts are NOT redirected (exact match only)", () => {
    for (const host of ["naveh-shamir-portal.vercel.app.evil.example", "x-naveh-shamir-portal.vercel.app", "naveh-shamir-portalXvercel.app", "NAVEH-SHAMIR-PORTAL.VERCEL.APP.example"]) {
      expect(redirectFor(host, "/businesses"), host).toBeNull();
    }
  });

  it("the official domain (and its subdomains) is never redirected, so there is no loop", () => {
    for (const host of ["neveshamir.co.il", "www.neveshamir.co.il", "staging.neveshamir.co.il"]) {
      expect(redirectFor(host, "/"), host).toBeNull();
      expect(redirectFor(host, "/businesses/foo?x=1"), host).toBeNull();
    }
  });

  it("localhost and future staging hosts are not redirected", () => {
    for (const host of ["localhost", "localhost:3000", "127.0.0.1:3000", "staging.example.com"]) {
      expect(redirectFor(host, "/businesses"), host).toBeNull();
    }
  });

  it("payment webhooks on the legacy host are left alone (a sender must not be bounced to another host)", () => {
    expect(redirectFor(LEGACY_VERCEL_PRODUCTION_HOST, "/api/webhooks/payme/some-secret")).toBeNull();
    // other API paths and lookalike prefixes are redirected normally
    expect(redirectFor(LEGACY_VERCEL_PRODUCTION_HOST, "/api/other")?.status).toBe(308);
    expect(redirectFor(LEGACY_VERCEL_PRODUCTION_HOST, "/api/webhooks-docs")?.status).toBe(308);
  });

  it("isLegacyVercelProductionHost matches only the exact host", () => {
    expect(isLegacyVercelProductionHost("naveh-shamir-portal.vercel.app")).toBe(true);
    expect(isLegacyVercelProductionHost("naveh-shamir-portal.vercel.app:443")).toBe(true);
    expect(isLegacyVercelProductionHost("naveh-shamir-portal-git-x-t.vercel.app")).toBe(false);
    expect(isLegacyVercelProductionHost("neveshamir.co.il")).toBe(false);
    expect(isLegacyVercelProductionHost("localhost:3000")).toBe(false);
    expect(isLegacyVercelProductionHost(null)).toBe(false);
  });
});
