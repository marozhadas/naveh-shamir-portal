import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { SECURITY_HEADERS } from "./security-headers";

function headerMap(headers: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(headers.map((h) => [h.key, h.value]));
}

describe("security headers", () => {
  it("are applied to every route by next.config", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((rule) => rule.source === "/:path*");
    expect(all).toBeDefined();
    const headers = headerMap(all!.headers);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
    expect(headers["Permissions-Policy"]).toContain("geolocation=()");
  });

  it("turns off X-Powered-By", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("does not add a CSP in this change, and leaves the payment feature alone for PayMe", () => {
    const keys = SECURITY_HEADERS.map((h) => h.key.toLowerCase());
    expect(keys).not.toContain("content-security-policy");
    expect(headerMap(SECURITY_HEADERS)["Permissions-Policy"]).not.toContain("payment");
  });
});
