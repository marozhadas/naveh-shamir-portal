import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ALLOWED_ORIGIN, CARD_A, CARD_B, DATA_CHANGING_STEPS, DEFAULT_MAX_CALLS, DOCUMENTED_TEST_CARDS, approvedSteps, diffPayments, installRecorder, last4, loadLabEnv, maxCalls, redact } from "./lab-support";

/** Safety tests for the LOCAL lab itself (offline, no network). They run in the normal `npm test`. */

const KEYS = ["SUMIT_LAB_APPROVED", "SUMIT_LAB_MAX_CALLS", "SUMIT_TEST_LAB_ENV_PROBE", "SUMIT_API_KEY", "SUMIT_API_PUBLIC_KEY", "PAYMENTS_PROVIDER", "SUPABASE_SERVICE_ROLE_KEY"] as const;

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of KEYS) delete process.env[key];
});

describe("redaction", () => {
  it("removes credentials, card numbers, CVV, tokens and citizen ids; keeps what is needed to compare", () => {
    process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
    const redacted = JSON.stringify(
      redact({
        Credentials: { CompanyID: 123456, APIKey: "secret-api-key-for-tests" },
        CardNumber: "5326107300020772",
        CVV: "033",
        CitizenID: "123456789",
        SingleUseToken: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        Data: { PaymentMethod: { ID: 5, CreditCard_LastDigits: "0772", CreditCard_CardMask: "532610******0772", CreditCard_Token: "perm", CreditCard_Number: "5326107300020772" }, Payment: { ID: 9, Amount: 39, Note: "contains secret-api-key-for-tests" } },
      }),
    );
    for (const forbidden of ["secret-api-key-for-tests", "5326107300020772", "033", "123456789", "aaaaaaaa-bbbb", "perm"]) expect(redacted, forbidden).not.toContain(forbidden);
    for (const kept of ["0772", "532610******0772", '"Amount":39', '"ID":9']) expect(redacted, kept).toContain(kept);
  });
});

describe("the documented test cards", () => {
  it("are exactly SUMIT's published test cards; support's recommended card (the second) is card A", () => {
    expect(DOCUMENTED_TEST_CARDS.map((card) => card.number)).toEqual([
      "5326105300985853",
      "5326107300020772",
      "5310840302789139",
      "5310840302789162",
      "5310840302789154",
      "4557430402321333",
      "4557430402821341",
      "4557440411874982",
    ]);
    expect(CARD_A.number).toBe("5326107300020772");
    expect(CARD_B.number).toBe("4557430402321333");
    expect(last4(CARD_A.number)).toBe("0772");
    expect(last4(CARD_B.number)).toBe("1333");
    expect(last4(null)).toBeNull();
    // the cards used by the lab are not expired
    for (const card of [CARD_A, CARD_B]) expect(new Date(card.year, card.month, 1).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("environment loading", () => {
  it("loads ONLY SUMIT_* and PAYMENTS_PROVIDER from the file, ignores empty values, never overrides, and returns names only", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sumit-lab-"));
    const file = path.join(dir, ".env.local");
    writeFileSync(file, ['SUPABASE_SERVICE_ROLE_KEY=should-not-be-loaded', 'SUMIT_API_KEY="from-file"', "SUMIT_API_PUBLIC_KEY=", "PAYMENTS_PROVIDER=sumit", "SUMIT_TEST_LAB_ENV_PROBE=probe", "# SUMIT_COMPANY_ID=1"].join("\n"));
    process.env.SUMIT_TEST_LAB_ENV_PROBE = "already-set";
    const loaded = loadLabEnv(file);
    expect(loaded.sort()).toEqual(["PAYMENTS_PROVIDER", "SUMIT_API_KEY"]);
    expect(process.env.SUMIT_API_KEY).toBe("from-file");
    expect(process.env.SUMIT_TEST_LAB_ENV_PROBE).toBe("already-set");
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(process.env.SUMIT_API_PUBLIC_KEY).toBeUndefined();
    expect(JSON.stringify(loaded)).not.toContain("from-file");
    expect(loadLabEnv(path.join(dir, "missing"))).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("approvals and budget", () => {
  it("steps are approved by NAME only - no wildcard - and the call budget is bounded", () => {
    process.env.SUMIT_LAB_APPROVED = " save-card , charge-saved ,, ";
    expect([...approvedSteps()].sort()).toEqual(["charge-saved", "save-card"]);
    process.env.SUMIT_LAB_APPROVED = "*";
    expect(approvedSteps().has("save-card")).toBe(false);
    delete process.env.SUMIT_LAB_APPROVED;
    expect(approvedSteps().size).toBe(0);

    expect(maxCalls()).toBe(DEFAULT_MAX_CALLS);
    for (const [value, expected] of [["5", 5], ["100", 100], ["101", DEFAULT_MAX_CALLS], ["0", DEFAULT_MAX_CALLS], ["abc", DEFAULT_MAX_CALLS]] as const) {
      process.env.SUMIT_LAB_MAX_CALLS = value;
      expect(maxCalls(), value).toBe(expected);
    }
  });
});

describe("the recorder", () => {
  const realFetch = vi.fn(async () => new Response(JSON.stringify({ Status: 0, Data: { SingleUseToken: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", Payment: { ID: 9 } } }), { status: 200 }));
  beforeEach(() => {
    realFetch.mockClear();
    vi.stubGlobal("fetch", realFetch);
    process.env.SUMIT_API_KEY = "secret-api-key-for-tests";
  });

  it("forwards to the real fetch, records a REDACTED copy, and counts the calls", async () => {
    const recorder = installRecorder(5);
    recorder.setStep("probe");
    const response = await fetch(`${ALLOWED_ORIGIN}billing/payments/get/`, { method: "POST", body: JSON.stringify({ Credentials: { CompanyID: 1, APIKey: "secret-api-key-for-tests" }, PaymentID: 9, CVV: "033" }) });
    expect((await response.json()).Status).toBe(0); // the caller still gets the untouched response
    expect(recorder.calls()).toBe(1);
    const text = JSON.stringify(recorder.exchanges);
    expect(recorder.exchanges[0]).toMatchObject({ step: "probe", path: "/billing/payments/get/", httpStatus: 200 });
    for (const forbidden of ["secret-api-key-for-tests", "033", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"]) expect(text, forbidden).not.toContain(forbidden);
    expect(recorder.lastResponse("/billing/payments/get/")).toMatchObject({ Data: { Payment: { ID: 9 } } });
  });

  it("refuses any host other than api.sumit.co.il - before sending anything", async () => {
    installRecorder(5);
    for (const url of ["https://app.sumit.co.il/x", "https://api.sumit.co.il.evil.example/x", "https://evil.example/https://api.sumit.co.il/", "http://api.sumit.co.il/x", "https://live.payme.io/api/generate-subscription"]) {
      await expect(fetch(url, { method: "POST", body: "{}" }), url).rejects.toThrow(/refuses/);
    }
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("stops at the call budget", async () => {
    const recorder = installRecorder(2);
    await fetch(`${ALLOWED_ORIGIN}a/`, { method: "POST", body: "{}" });
    await fetch(`${ALLOWED_ORIGIN}b/`, { method: "POST", body: "{}" });
    await expect(fetch(`${ALLOWED_ORIGIN}c/`, { method: "POST", body: "{}" })).rejects.toThrow(/budget/);
    expect(recorder.calls()).toBe(2);
    expect(realFetch).toHaveBeenCalledTimes(2);
  });
});

describe("diffPayments", () => {
  it("reports keys on one side only and differing values", () => {
    expect(diffPayments({ A: 1, B: 2, C: 3 }, { A: 1, B: 9, D: 4 })).toEqual({ onlyInFirst: ["C"], onlyInSecond: ["D"], differing: ["B"] });
    expect(diffPayments(null, null)).toEqual({ onlyInFirst: [], onlyInSecond: [], differing: [] });
  });
});

describe("static guard rails for the lab", () => {
  const dir = __dirname;
  const lab = readFileSync(path.join(dir, "sumit-lab.lab.ts"), "utf8");
  const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("every data-changing step is skipped unless approved by name, and checks the attested identity again inside", () => {
    for (const step of DATA_CHANGING_STEPS) {
      expect(lab, step).toContain(`it.skipIf(!approved.has("${step}"))("${step}:`);
      expect(lab, step).toContain(`ready("${step}")`);
    }
    expect(code(lab).match(/it\.skipIf\(!approved\.has\(/g)?.length).toBe(DATA_CHANGING_STEPS.length);
  });

  it("the app never imports the lab, the lab never touches PayMe or the production environment, and nothing prints secrets", () => {
    const labFiles = readdirSync(dir).filter((name) => /\.ts$/.test(name) && !/\.test\./.test(name));
    for (const name of labFiles) {
      const source = code(readFileSync(path.join(dir, name), "utf8"));
      expect(source, name).not.toMatch(/payme(?!nt)/i);
      expect(source, name).not.toMatch(/SUMIT_ALLOW_PRODUCTION|SUPABASE|createAdminSupabaseClient/);
      expect(source, name).not.toMatch(/console\.(log|info|warn|error)\([^)]*(apiKey|apiPublicKey|process\.env)/);
    }
    const srcDir = path.resolve(dir, "..", "..", "src");
    const walk = (folder: string): string[] =>
      readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]));
    for (const file of walk(srcDir).filter((candidate) => /\.(ts|tsx)$/.test(candidate))) expect(readFileSync(file, "utf8"), file).not.toMatch(/(from|import\()\s*["'][^"']*sumit-lab/);
  });

  it("the lab's raw card tokenization is allowlist-only and lives only in the lab (the app has no path that sends a raw card number)", () => {
    expect(lab).toContain("DOCUMENTED_TEST_CARDS.some((documented) => documented.number === card.number)");
    const appSumit = path.resolve(dir, "..", "..", "src", "lib", "sumit");
    for (const name of readdirSync(appSumit).filter((entry) => /\.ts$/.test(entry) && !/\.test\./.test(entry))) {
      expect(readFileSync(path.join(appSumit, name), "utf8"), name).not.toMatch(/tokenizesingleuse|CardNumber/);
    }
  });
});
