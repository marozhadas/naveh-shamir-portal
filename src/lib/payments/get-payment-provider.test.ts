import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

import { PaymentsConfigurationError, getPaymentProvider, getPaymentsProviderId, parsePaymentsProvider } from "./get-payment-provider";

const KEYS = ["PAYMENTS_PROVIDER", "SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "SUMIT_ENVIRONMENT", "SUMIT_TEST_COMPANY_ID", "SUMIT_ALLOW_PRODUCTION"] as const;
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

function configureSumit() {
  process.env.SUMIT_COMPANY_ID = "123456";
  process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  process.env.SUMIT_API_PUBLIC_KEY = "public-key-for-tests";
  process.env.SUMIT_ENVIRONMENT = "test";
  process.env.SUMIT_TEST_COMPANY_ID = "123456"; // the approved test organization = the configured one
}

function thrown(fn: () => unknown): PaymentsConfigurationError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PaymentsConfigurationError);
    return error as PaymentsConfigurationError;
  }
  throw new Error("expected a PaymentsConfigurationError");
}

describe("PAYMENTS_PROVIDER selection - SUMIT is the only provider, fail closed, no guessing", () => {
  it("'sumit' with every required SUMIT variable: the SUMIT provider (case and spaces ignored)", () => {
    configureSumit();
    for (const value of ["sumit", " SUMIT ", "Sumit"]) {
      process.env.PAYMENTS_PROVIDER = value;
      expect(getPaymentsProviderId(), value).toBe("sumit");
      expect(getPaymentProvider().id, value).toBe("sumit");
    }
  });

  it("UNSET or blank: a clear configuration error - no provider is guessed, even when SUMIT is fully configured", () => {
    for (const value of [undefined, "", "   "]) {
      if (value === undefined) delete process.env.PAYMENTS_PROVIDER;
      else process.env.PAYMENTS_PROVIDER = value;
      const error = thrown(() => parsePaymentsProvider(value));
      expect(error.variables).toEqual(["PAYMENTS_PROVIDER"]);
      expect(error.message).toMatch(/not set/);
    }
    delete process.env.PAYMENTS_PROVIDER;
    thrown(() => getPaymentsProviderId());
    thrown(() => getPaymentProvider());
    configureSumit();
    thrown(() => getPaymentProvider()); // SUMIT configured, but the switch was not set: still no guess
  });

  it("'payme' is NOT a selectable provider any more - PayMe is legacy/dormant and is never selected, whatever SUMIT's state", () => {
    process.env.PAYMENTS_PROVIDER = "payme";
    expect(thrown(() => getPaymentsProviderId()).message).toMatch(/legacy\/dormant/);
    thrown(() => getPaymentProvider());
    configureSumit();
    thrown(() => getPaymentProvider());
    expect(() => parsePaymentsProvider(" PayMe ")).toThrow(PaymentsConfigurationError);
  });

  it("'sumit' with ANYTHING missing throws a clear configuration error and never falls back to PayMe", () => {
    process.env.PAYMENTS_PROVIDER = "sumit";
    thrown(() => getPaymentProvider());

    for (const missing of ["SUMIT_COMPANY_ID", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY"] as const) {
      configureSumit();
      delete process.env[missing];
      const error = thrown(() => getPaymentProvider());
      expect(error.variables, missing).toEqual([missing]);
      expect(error.message, missing).toContain(missing);
    }
  });

  it("the approved-test-organization guard fails closed through the selector too: a wrong organization, an unset environment or a locked production never yields a provider", () => {
    process.env.PAYMENTS_PROVIDER = "sumit";
    configureSumit();
    process.env.SUMIT_COMPANY_ID = "999111"; // not the approved test organization (123456)
    const wrongOrganization = thrown(() => getPaymentProvider());
    expect(wrongOrganization.variables).toEqual(["SUMIT_COMPANY_ID"]);
    expect(wrongOrganization.message).toMatch(/not the approved test organization/);
    expect(wrongOrganization.message).not.toMatch(/999111|123456/);

    configureSumit();
    delete process.env.SUMIT_ENVIRONMENT;
    expect(thrown(() => getPaymentProvider()).variables).toEqual(["SUMIT_ENVIRONMENT"]);

    configureSumit();
    process.env.SUMIT_ENVIRONMENT = "production";
    process.env.SUMIT_COMPANY_ID = "999111";
    expect(thrown(() => getPaymentProvider()).variables).toEqual(["SUMIT_ALLOW_PRODUCTION"]);
    process.env.SUMIT_ALLOW_PRODUCTION = "true";
    expect(getPaymentProvider().id).toBe("sumit");
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
    const error = thrown(() => getPaymentProvider());
    expect(error.message).toContain("SUMIT_COMPANY_ID");
    expect(error.message).not.toContain("secret-api-key-for-tests");
  });

  it("the selector never returns null and never names PayMe as a result", () => {
    const source = readFileSync(path.resolve(__dirname, "get-payment-provider.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(source).not.toMatch(/return null/);
    expect(source).not.toMatch(/return "payme"|=== "payme"\) return/);
    expect(source).not.toMatch(/lib\/payme/);
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
    // (Stage 2A added the server-side SUMIT save flow, repositories/sumit-payment-method-service.ts - checked just below.)
    // (lib/payme/dormant.ts asks the selector whether PayMe is the provider - it never is: that is the single switch that keeps PayMe off.)
    const allowed = ["lib/sumit/", "lib/payments/", "domain/payments/", "repositories/sumit-payment-method-service", "lib/payme/dormant.ts"];
    for (const file of walk(root)) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      if (!/\.(ts|tsx)$/.test(rel) || allowed.some((prefix) => rel.startsWith(prefix))) continue;
      // the shared "payments temporarily unavailable" constants are the one thing PayMe's owner/admin actions may import
      const source = readFileSync(file, "utf8").split("@/lib/payments/payments-unavailable").join("");
      expect(source, rel).not.toMatch(/@\/lib\/sumit|@\/lib\/payments|@\/domain\/payments/);
    }
  });

  it("the SUMIT save flow is not wired to any action, form, wizard, trial, approval or cron yet", () => {
    for (const file of walk(root)) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      // production code only (tests may name the file); the module itself is of course allowed to
      if (!/\.(ts|tsx)$/.test(rel) || /\.test\./.test(rel) || rel.startsWith("repositories/sumit-payment-method-service")) continue;
      expect(readFileSync(file, "utf8"), rel).not.toMatch(/sumit-payment-method-service/);
    }
  });

  it("the migration is additive, allows 'sumit', keeps provider_token out of SUMIT rows and lives outside any auto-run folder", () => {
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
