import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

const ENV_KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET", "PAYME_CLIENT_KEY", "PAYME_SECRET_KEY"] as const;
const PUBLIC_KEY = "public-key-for-browser-456";
const SELLER = "MPL-TEST-SELLER-789";

function configure() {
  process.env.PAYME_ENV = "sandbox";
  process.env.PAYME_SELLER_ID = SELLER;
  process.env.PAYME_HOSTED_FIELDS_KEY = PUBLIC_KEY;
  process.env.PAYME_WEBHOOK_SECRET = "w".repeat(40);
}

describe("PayMe credential model for a Seller account (Seller ID + Public Key; no Partner Key, no Secret Key)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("the module is on with exactly four server variables — and leftover PAYME_CLIENT_KEY / PAYME_SECRET_KEY are ignored", async () => {
    const { getPayMeConfig, getMissingPayMeVariables } = await import("./config");
    configure();
    expect(getPayMeConfig()).not.toBeNull();
    expect(getMissingPayMeVariables()).toEqual([]);
    process.env.PAYME_CLIENT_KEY = "legacy-partner-key";
    process.env.PAYME_SECRET_KEY = "legacy-secret-key";
    expect(Object.keys(getPayMeConfig() ?? {}).sort()).toEqual(["baseUrl", "env", "hostedFieldsKey", "sellerId", "webhookSecret"]);
  });

  it("the admin banner names only the four required variables", async () => {
    const { getMissingPayMeVariables, PAYME_ENV_VARIABLE_NAMES } = await import("./config");
    expect(getMissingPayMeVariables()).toEqual(["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"]);
    expect([...PAYME_ENV_VARIABLE_NAMES]).toEqual(["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"]);
  });

  it("generate and cancel identify the seller by seller_payme_id alone: no partner key, no secret, no public key in any request", async () => {
    configure();
    process.env.PAYME_CLIENT_KEY = "legacy-partner-key";
    process.env.PAYME_SECRET_KEY = "legacy-secret-key";
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status_code: 0, sub_payme_id: "SUB-1" }), { status: 200 }));
    const { generatePayMeSubscription, cancelPayMeSubscription } = await import("./client");

    await generatePayMeSubscription({
      buyerKey: "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP",
      merchantSubscriptionId: "reg-1",
      priceAgorot: 3900,
      iterationType: 3,
      startDate: "01/12/2026 10:00",
      description: "Plus",
      callbackUrl: "https://example.test/api/webhooks/payme/x",
    });
    await cancelPayMeSubscription("SUB-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const endpoints = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(endpoints).toEqual(["https://sandbox.payme.io/api/generate-subscription", "https://sandbox.payme.io/api/cancel-subscription"]);
    for (const call of fetchMock.mock.calls) {
      const raw = String((call[1] as { body: string }).body);
      expect(raw).not.toContain("payme_client_key");
      expect(raw).not.toContain("legacy-partner-key");
      expect(raw).not.toContain("legacy-secret-key");
      expect(raw).not.toContain(PUBLIC_KEY);
      expect(JSON.parse(raw).seller_payme_id).toBe(SELLER);
    }
  });

  it("there is no way to read a subscription back from PayMe: get-subscriptions is not called anywhere in the code", async () => {
    const client = fs.readFileSync(path.resolve(__dirname, "client.ts"), "utf8");
    const executable = client.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(executable).not.toMatch(/get-subscription/);
    expect(Object.keys(await import("./client"))).not.toContain("getPayMeSubscription");
  });

  it("the webhook secret and seller id are scrubbed from any error text that leaves the client", async () => {
    configure();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status_code: 1, status_error_details: `bad request for ${SELLER} via ${"w".repeat(40)}` }), { status: 200 }));
    const { cancelPayMeSubscription } = await import("./client");
    const error = await cancelPayMeSubscription("SUB-1").catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(SELLER);
    expect((error as Error).message).not.toContain("w".repeat(40));
  });
});

describe("server-only values never reach browser code", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
    }
    return out;
  }

  it("no \"use client\" file reads process.env.PAYME_* or mentions the seller id / webhook secret", () => {
    const clientFiles = walk(path.resolve(__dirname, "../..")).filter((file) => /^\s*["']use client["']/.test(fs.readFileSync(file, "utf8").slice(0, 200)));
    expect(clientFiles.length).toBeGreaterThan(10);
    for (const file of clientFiles) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/process\.env\.PAYME_|webhookSecret|sellerId/);
    }
  });

  it("the only config field that is ever passed to a component is the public hosted-fields key", () => {
    for (const rel of ["app/business/trial/page.tsx", "app/business/dashboard/(chrome)/subscription/page.tsx"]) {
      const source = fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
      expect(source, rel).not.toMatch(/sellerId|webhookSecret/);
      expect(source, rel).toContain("hostedFieldsKey={payMeConfig.hostedFieldsKey}");
    }
  });
});
