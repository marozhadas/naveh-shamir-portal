import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

// NOTE: unlike the other PayMe tests, this file does NOT enable the legacy path - it proves the real, dormant behaviour.

import { isPayMeProviderActive } from "./dormant";
import { getPayMeConfig, isPayMeConfigured, readPayMeConfigFromEnv } from "./config";
import { getPayMeConfigForBusiness, getPayMeConfigForRegistrant } from "./flow-access";
import { generatePayMeSubscription, cancelPayMeSubscription } from "./client";

const PAYME_ENV_KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET", "PAYME_SANDBOX_TEST_EMAILS", "PAYMENTS_PROVIDER"] as const;
const fetchMock = vi.fn();

/** A COMPLETE, valid PayMe configuration - exactly what production has today (sandbox + test emails) or live. */
function fullPayMeEnv(env: "sandbox" | "live") {
  process.env.PAYME_ENV = env;
  process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER-789";
  process.env.PAYME_HOSTED_FIELDS_KEY = "public-key-for-browser-456";
  process.env.PAYME_WEBHOOK_SECRET = "w".repeat(40);
  process.env.PAYME_SANDBOX_TEST_EMAILS = "noa@example.com";
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of PAYME_ENV_KEYS) delete process.env[key];
});

describe("PayMe is dormant: no environment can switch it back on", () => {
  it("the provider selection never says PayMe - for every PAYMENTS_PROVIDER value, with or without a full PAYME_* configuration", () => {
    for (const env of ["sandbox", "live"] as const) {
      fullPayMeEnv(env);
      for (const value of [undefined, "", "payme", "PayMe", "sumit", "stripe", "payme,sumit"]) {
        if (value === undefined) delete process.env.PAYMENTS_PROVIDER;
        else process.env.PAYMENTS_PROVIDER = value;
        expect(isPayMeProviderActive(), `${env} / ${String(value)}`).toBe(false);
      }
    }
  });

  it("with a complete PayMe configuration the entry points still see NO configuration (no fallback to PayMe)", async () => {
    for (const env of ["sandbox", "live"] as const) {
      fullPayMeEnv(env);
      expect(readPayMeConfigFromEnv(), "the raw parse still reads the variables (legacy/debug only)").not.toBeNull();
      expect(getPayMeConfig(), env).toBeNull();
      expect(isPayMeConfigured(), env).toBe(false);
      expect(await getPayMeConfigForRegistrant("noa@example.com"), `${env}: registration step 6 / payment resume`).toBeNull();
      expect(await getPayMeConfigForBusiness("reg-123"), `${env}: trial page / payment actions / trial start`).toBeNull();
    }
  });

  it("PayMe's own API client refuses to run: no request, no generate-subscription, no buyer key", async () => {
    fullPayMeEnv("live");
    await expect(
      generatePayMeSubscription({ buyerKey: "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP", merchantSubscriptionId: "reg-1", priceAgorot: 3900, iterationType: 3, startDate: "20/11/2026", description: "Plus", callbackUrl: "https://x.example/cb" }),
    ).rejects.toMatchObject({ kind: "not-configured" });
    await expect(cancelPayMeSubscription("SUB-123456")).rejects.toMatchObject({ kind: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the PayMe webhook route answers 404 even for a correct secret and never processes a callback", async () => {
    fullPayMeEnv("live");
    const processCallback = vi.fn();
    vi.doMock("./process-callback", () => ({ processPayMeCallback: processCallback }));
    vi.resetModules();
    const { POST, GET } = await import("@/app/api/webhooks/payme/[secret]/route");
    const secret = "w".repeat(40);
    const request = new Request(`https://neveshamir.co.il/api/webhooks/payme/${secret}`, { method: "POST", body: "sub_payme_id=SUB-123456&notify_type=sub-active" });
    const response = await POST(request, { params: Promise.resolve({ secret }) });
    expect(response.status).toBe(404);
    expect(processCallback).not.toHaveBeenCalled();
    expect((await GET()).status).toBe(404);
    vi.doUnmock("./process-callback");
  });
});

describe("static guard rails: nothing new can open PayMe", () => {
  const root = path.resolve(__dirname, "../..");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  const rel = (file: string) => path.relative(root, file).replace(/\\/g, "/");
  const production = walk(root).filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\./.test(file));
  const text = (file: string) => readFileSync(file, "utf8");

  it("only the known legacy modules import PayMe code: a NEW file that does so fails this test and must be reviewed", () => {
    const importers = production.filter((file) => !rel(file).startsWith("lib/payme/") && /@\/lib\/payme\//.test(text(file))).map(rel).sort();
    expect(importers).toEqual([
      "app/admin/(protected)/businesses/[id]/BillingTestSection.tsx",
      "app/admin/(protected)/businesses/[id]/actions.ts",
      "app/admin/(protected)/revenue/page.tsx",
      "app/api/webhooks/payme/[secret]/route.ts",
      "app/business/dashboard/(chrome)/subscription/page.tsx",
      "app/business/dashboard/payment-actions.ts",
      "app/business/trial/page.tsx",
      "domain/decide-registration-approval.ts",
      "lib/admin/live-readiness.ts",
      "lib/business-owner/payment-resume.ts",
      "repositories/sumit-payment-method-service.ts", // only the pure plan builder (see the next test)
      "repositories/sumit-trial-activation.ts", // only the pure plan builder (see the next test)
      "repositories/supabase-subscription-service.ts",
    ]);
  });

  it("the only route / page under a PayMe path is the legacy webhook, and the SUMIT side imports nothing from PayMe except the pure plan builder", () => {
    const routes = production.filter((file) => /\/(route|page)\.tsx?$/.test(rel(file)) && /payme(?!nt)/i.test(rel(file))).map(rel);
    expect(routes).toEqual(["app/api/webhooks/payme/[secret]/route.ts"]);

    const sumitSide = production.filter((file) => /^(lib\/sumit|lib\/payments|domain\/payments|repositories\/sumit-)/.test(rel(file)));
    expect(sumitSide.length).toBeGreaterThan(0);
    for (const file of sumitSide) {
      const payMeImports = [...text(file).matchAll(/from "(@\/lib\/payme\/[^"]+)"/g)].map((match) => match[1]);
      // the plan builder is provider-neutral; nothing else on the SUMIT side may touch PayMe code
      expect(payMeImports.filter((name) => name !== "@/lib/payme/build-subscription-plan"), rel(file)).toEqual([]);
    }
  });

  it("the PayMe SDK is loaded from exactly one place - the legacy payment form - which only pages driven by the (dormant, null) PayMe configuration render", () => {
    expect(production.filter((file) => text(file).includes("cdn.payme.io")).map(rel)).toEqual(["components/business-dashboard/PaymentMethodTrialForm/PaymentMethodTrialForm.tsx"]);

    // (the SUMIT card form only borrows the form's payer validation and trust badges - it does not render the PayMe form)
    const users = production.filter((file) => /import \{[^}]*\bPaymentMethodTrialForm\b[^}]*\}/.test(text(file)) && !rel(file).startsWith("components/business-dashboard/PaymentMethodTrialForm/")).map(rel).sort();
    expect(users).toEqual(["app/business/dashboard/(chrome)/subscription/page.tsx", "app/business/trial/page.tsx"]);
    // the registration step (wizard, resume page, SUMIT form and action) has no PayMe at all
    for (const file of ["app/business/register/plus/PlusRegistrationWizard.tsx", "app/business/register/plus/page.tsx", "app/business/register/premium/page.tsx", "app/business/payment-method/page.tsx", "app/business/payment-method/ResumePaymentStep.tsx", "components/business-dashboard/SumitCardForm/SumitCardForm.tsx", "app/business/dashboard/sumit-payment-actions.ts"]) {
      expect(text(path.join(root, file)).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""), file).not.toMatch(/payme(?!nt)/i);
    }
    // every page that decides to render it first asks the PayMe configuration (null while dormant)
    for (const page of ["app/business/trial/page.tsx", "app/business/dashboard/(chrome)/subscription/page.tsx"]) {
      expect(text(path.join(root, page)), page).toMatch(/getPayMeConfig(ForRegistrant|ForBusiness)\(/);
    }
  });

  it("the unavailable state is wired into the owner and admin PayMe actions", () => {
    const actions = text(path.join(root, "app/business/dashboard/payment-actions.ts"));
    expect(actions.match(/return paymentsUnavailable\(\)/g)?.length).toBe(4);
    expect(actions).toContain("PAYMENTS_TEMPORARILY_UNAVAILABLE_MESSAGE");
    const admin = text(path.join(root, "app/admin/(protected)/businesses/[id]/actions.ts"));
    expect(admin).toMatch(/blocked-payme-not-configured"\) return \{ status: "error", message: APPROVAL_BLOCKED_MESSAGE\[path\], code: PAYMENTS_TEMPORARILY_UNAVAILABLE \}/);
    expect(admin).toMatch(/changeBusinessBillingTestAction[\s\S]*?if \(!isPayMeProviderActive\(\)\) return \{ status: "validation-error"/);
  });

  it("no billing_payment_methods write relies on a default provider: the Insert type requires it and every writer names it", () => {
    const types = text(path.join(root, "lib/supabase/database.types.ts"));
    expect(types).toMatch(/provider: BillingPaymentMethodRow\["provider"\];/);
    expect(types).not.toMatch(/provider\?: BillingPaymentMethodRow\["provider"\]/);
    const writers = production.filter((candidate) => /billing_payment_methods"\)\s*\.(insert|upsert)/.test(text(candidate)));
    expect(writers.map(rel).sort()).toEqual(["repositories/sumit-payment-method-service.ts", "repositories/supabase-subscription-service.ts"]);
    for (const file of writers) {
      const payloads = [...text(file).matchAll(/billing_payment_methods"\)\s*\.(?:insert|upsert)\(\s*(\{[\s\S]*?\})\s*,/g)].map((match) => match[1]);
      expect(payloads.length, rel(file)).toBeGreaterThan(0);
      for (const payload of payloads) expect(payload, rel(file)).toMatch(/\bprovider: "(payme|sumit)"/);
    }
  });

  it("the proposed migration that drops the provider default is minimal and not auto-run", () => {
    const sql = readFileSync(path.resolve(root, "..", "supabase", "pending-migrations", "20261020150000_drop_billing_payment_methods_provider_default.sql"), "utf8");
    const code = sql.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
    expect(code).toMatch(/alter table public\.billing_payment_methods alter column provider drop default;/);
    expect(code).toMatch(/raise exception 'billing_payment_methods\.provider has no default/);
    expect(code).toMatch(/^begin;/m);
    expect(code).toMatch(/^commit;/m);
    expect(code).not.toMatch(/drop (table|column|constraint|index)|delete from|update public\.|insert into|truncate|policy|trigger/i);
  });
});
