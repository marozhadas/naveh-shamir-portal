import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { PaymentsConfigurationError, getPaymentProvider, getPaymentsProviderId, parsePaymentsProvider } from "./get-payment-provider";

const KEYS = ["PAYMENTS_PROVIDER", "SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY"] as const;
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

function configureSumit() {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
}

describe("PAYMENTS_PROVIDER selection - fail closed", () => {
  it("unset (or blank): the existing PayMe behaviour, even when SUMIT happens to be fully configured", () => {
    expect(parsePaymentsProvider(undefined)).toBe("payme");
    expect(parsePaymentsProvider("")).toBe("payme");
    expect(parsePaymentsProvider("   ")).toBe("payme");
    expect(getPaymentsProviderId()).toBe("payme");
    expect(getPaymentProvider()).toBeNull();
    configureSumit();
    expect(getPaymentProvider()).toBeNull();
  });

  it("'payme': PayMe (no provider object - PayMe keeps its own flow), whatever SUMIT's state", () => {
    process.env.PAYMENTS_PROVIDER = "payme";
    expect(getPaymentsProviderId()).toBe("payme");
    expect(getPaymentProvider()).toBeNull();
    configureSumit();
    expect(getPaymentProvider()).toBeNull();
  });

  it("'sumit' with every required variable: the SUMIT provider (case and spaces ignored)", () => {
    configureSumit();
    for (const value of ["sumit", " SUMIT ", "Sumit"]) {
      process.env.PAYMENTS_PROVIDER = value;
      expect(getPaymentProvider()?.id, value).toBe("sumit");
    }
  });

  it("'sumit' with ANYTHING missing throws a clear configuration error and never falls back to PayMe", () => {
    process.env.PAYMENTS_PROVIDER = "sumit";
    expect(() => getPaymentProvider()).toThrow(PaymentsConfigurationError);

    for (const missing of ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY"] as const) {
      configureSumit();
      delete process.env[missing];
      let error: unknown;
      try {
        getPaymentProvider();
      } catch (caught) {
        error = caught;
      }
      expect(error, missing).toBeInstanceOf(PaymentsConfigurationError);
      expect((error as PaymentsConfigurationError).variables).toEqual([missing]);
      expect((error as PaymentsConfigurationError).message).toContain(missing);
    }
  });

  it("an invalid SUMIT_COMPANY_ID counts as missing", () => {
    configureSumit();
    process.env.SUMIT_COMPANY_ID = "not-a-number";
    process.env.PAYMENTS_PROVIDER = "sumit";
    expect(() => getPaymentProvider()).toThrow(/SUMIT_COMPANY_ID/);
  });

  it("an unknown provider value is a configuration error - a typo never selects a provider", () => {
    for (const value of ["stripe", "sumit2", "paymee", "true", "1", "sumit,payme"]) {
      expect(() => parsePaymentsProvider(value), value).toThrow(PaymentsConfigurationError);
      process.env.PAYMENTS_PROVIDER = value;
      expect(() => getPaymentsProviderId(), value).toThrow(PaymentsConfigurationError);
      expect(() => getPaymentProvider(), value).toThrow(PaymentsConfigurationError);
    }
    configureSumit();
    process.env.PAYMENTS_PROVIDER = "stripe";
    expect(() => getPaymentProvider()).toThrow(/PAYMENTS_PROVIDER/);
  });

  it("the errors name variables only - never a secret value", () => {
    process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
    process.env.PAYMENTS_PROVIDER = "sumit";
    let message = "";
    try {
      getPaymentProvider();
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("SUMIT_COMPANY_ID");
    expect(message).not.toContain("secret-api-key-for-tests");
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
    // a CHECK passes on NULL, so the SUMIT branch must state IS NOT NULL for the customer id explicitly
    expect(code).toMatch(/provider = 'sumit' and provider_token is null and provider_customer_id is not null and provider_customer_id ~/);
    expect(code).toMatch(/provider = 'payme' and provider_token is not null and provider_customer_id is null/);
    expect(code).toMatch(/add column provider_customer_id text/);
    // provider-scoped REAL unique constraints (an upsert's onConflict cannot use a partial index)
    expect(code).toMatch(/unique \(provider, provider_customer_id\)/);
    expect(code).toMatch(/unique \(provider, provider_payment_id\)/);
    expect(code).not.toMatch(/create (unique )?index/i);
    // runs once only, inside one transaction, without waiting on locks
    expect(code).toMatch(/^begin;/m);
    expect(code).toMatch(/^commit;/m);
    expect(code).toMatch(/raise exception 'sumit_provider_support looks already applied/);
    expect(code).toMatch(/lock_timeout/);
    // additive: nothing is dropped except the four provider CHECKs it replaces, and the NOT NULL on provider_token
    expect([...code.matchAll(/drop constraint (\w+)/g)].map((match) => match[1]).sort()).toEqual([
      "billing_events_provider_check",
      "billing_payment_methods_provider_check",
      "billing_transactions_provider_check",
      "business_subscriptions_payment_provider_check",
    ]);
    expect(code).not.toMatch(/drop (table|column|index|policy|trigger|function|view)|truncate|delete from|update public\.|insert into/i);
    // no RLS change, no trigger / function / external call
    expect(code).not.toMatch(/row level security|create policy|alter policy|create trigger|create (or replace )?function|http|net\./i);
    expect(statSync(path.join(repoRoot, "supabase")).isDirectory()).toBe(true);
    expect(() => statSync(path.join(repoRoot, "supabase", "migrations"))).toThrow();
  });
});
