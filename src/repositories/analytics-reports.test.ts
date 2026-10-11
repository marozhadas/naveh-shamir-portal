import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function source(file: string): string {
  return readFileSync(path.resolve(__dirname, file), "utf8");
}

/** Every export of a "use server" file is a publicly callable endpoint, so this is what the build would register. */
function exportedFunctions(src: string): string[] {
  return [...src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)].map((m) => m[1]);
}

describe("analytics Server Action surface", () => {
  it("analytics-service.ts (the only 'use server' file) exports just trackAnalyticsEvent", () => {
    const src = source("./analytics-service.ts");
    expect(src.trimStart().startsWith('"use server"')).toBe(true);
    expect(exportedFunctions(src)).toEqual(["trackAnalyticsEvent"]);
  });

  it("the admin/owner readers live in a server-only module that is not a Server Action file", () => {
    const src = source("./analytics-reports.ts");
    expect(src.trimStart().startsWith("\"use server\"")).toBe(false);
    expect(src).toMatch(/^import "server-only";/m);
    expect(exportedFunctions(src).sort()).toEqual(["getAnalyticsSummary", "getBusinessAnalyticsForOwner"]);
  });

  it("the admin and owner pages import the readers from the server-only module", () => {
    for (const file of ["../app/admin/(protected)/analytics/page.tsx", "../app/business/dashboard/(chrome)/analytics/page.tsx"]) {
      const src = source(file);
      expect(src).toContain("@/repositories/analytics-reports");
      expect(src).not.toContain("@/repositories/analytics-service");
    }
  });
});
