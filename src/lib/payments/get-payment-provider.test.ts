import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { getPaymentProvider, getPaymentsProviderId, parsePaymentsProvider } from "./get-payment-provider";

const KEYS = ["PAYMENTS_PROVIDER", "SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY"] as const;
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

function configureSumit() {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
}

describe("PAYMENTS_PROVIDER selection", () => {
  it("only 'sumit' selects SUMIT; unset or anything else keeps PayMe", () => {
    expect(parsePaymentsProvider(undefined)).toBe("payme");
    expect(parsePaymentsProvider("")).toBe("payme");
    expect(parsePaymentsProvider("stripe")).toBe("payme");
    expect(parsePaymentsProvider("payme")).toBe("payme");
    expect(parsePaymentsProvider("sumit")).toBe("sumit");
    expect(parsePaymentsProvider(" SUMIT ")).toBe("sumit");
    expect(getPaymentsProviderId()).toBe("payme");
  });

  it("no provider object unless PAYMENTS_PROVIDER=sumit AND SUMIT is configured", () => {
    expect(getPaymentProvider()).toBeNull();
    configureSumit();
    expect(getPaymentProvider()).toBeNull(); // configured, but the app is still on PayMe
    process.env.PAYMENTS_PROVIDER = "sumit";
    expect(getPaymentProvider()?.id).toBe("sumit");
    delete process.env.SUMIT_API_KEY;
    expect(getPaymentProvider()).toBeNull(); // switched on, but not configured
  });
});

describe("Stage 1 guard rails (static)", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
  const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });

  it("the SUMIT / provider modules are server-only, log nothing and never touch NEXT_PUBLIC variables", () => {
    for (const rel of ["lib/sumit/config.ts", "lib/sumit/client.ts", "lib/sumit/sumit-payment-provider.ts", "lib/payments/get-payment-provider.ts"]) {
      expect(read(rel), rel).toContain('import "server-only";');
      expect(code(rel), rel).not.toMatch(/console\./);
      expect(code(rel), rel).not.toMatch(/NEXT_PUBLIC_/);
    }
  });

  it("the domain contract is pure: no server-only, no I/O, no provider module imports", () => {
    expect(code("domain/payments/payment-provider.ts")).not.toMatch(/server-only|fetch\(|process\.env|from "@\/lib/);
  });

  it("no recurring endpoint is ever used", () => {
    for (const rel of ["lib/sumit/client.ts", "lib/sumit/sumit-payment-provider.ts"]) {
      expect(code(rel), rel).not.toMatch(/billing\/recurring/);
    }
  });

  it("nothing outside the new modules imports them yet: the wizard, approval, trial, grace, admin revenue and the PayMe callbacks are untouched", () => {
    const allowed = ["lib/sumit/", "lib/payments/", "domain/payments/"];
    for (const file of walk(root)) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      if (!/\.(ts|tsx)$/.test(rel) || allowed.some((prefix) => rel.startsWith(prefix))) continue;
      expect(readFileSync(file, "utf8"), rel).not.toMatch(/@\/lib\/sumit|@\/lib\/payments|@\/domain\/payments/);
    }
  });

  it("the proposed migration is additive, allows 'sumit', keeps provider_token out of SUMIT rows and lives outside any auto-run folder", () => {
    const repoRoot = path.resolve(root, "..");
    const file = path.join(repoRoot, "supabase", "pending-migrations", "20261020000000_sumit_provider_support.sql");
    const sql = readFileSync(file, "utf8");
    const code = sql.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
    expect(code.match(/in \('payme', 'sumit'\)/g)?.length).toBe(4);
    expect(code).toMatch(/provider = 'sumit' and provider_token is null and provider_customer_id/);
    expect(code).toMatch(/add column provider_customer_id text/);
    expect(code).not.toMatch(/drop table|truncate|delete from|update public\./i);
    expect(statSync(path.join(repoRoot, "supabase")).isDirectory()).toBe(true);
    expect(() => statSync(path.join(repoRoot, "supabase", "migrations"))).toThrow();
  });
});
