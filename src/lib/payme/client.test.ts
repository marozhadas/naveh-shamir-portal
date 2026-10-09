import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));

const ENV_KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_SECRET_KEY", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET", "PAYME_CLIENT_KEY"] as const;
const SECRET = "secret-key-DO-NOT-LEAK-123";
const PUBLIC_KEY = "public-key-for-browser-456";
const SELLER = "MPL-TEST-SELLER-789";

function configure() {
  process.env.PAYME_ENV = "sandbox";
  process.env.PAYME_SELLER_ID = SELLER;
  process.env.PAYME_SECRET_KEY = SECRET;
  process.env.PAYME_HOSTED_FIELDS_KEY = PUBLIC_KEY;
  process.env.PAYME_WEBHOOK_SECRET = "w".repeat(40);
}

describe("PayMe credential mapping (Seller ID + Public Key + Secret Key, no Partner Key)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("works without any PAYME_CLIENT_KEY, and a leftover one is ignored", async () => {
    const { getPayMeConfig, getMissingPayMeVariables } = await import("./config");
    configure();
    expect(getPayMeConfig()).not.toBeNull();
    expect(getMissingPayMeVariables()).toEqual([]);
    process.env.PAYME_CLIENT_KEY = "legacy";
    expect(Object.keys(getPayMeConfig() ?? {})).not.toContain("clientKey");
  });

  it("the admin banner names the new variables (and never PAYME_CLIENT_KEY)", async () => {
    const { getMissingPayMeVariables, PAYME_ENV_VARIABLE_NAMES } = await import("./config");
    expect(getMissingPayMeVariables()).toEqual(["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_SECRET_KEY", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"]);
    expect(PAYME_ENV_VARIABLE_NAMES).not.toContain("PAYME_CLIENT_KEY");
    expect(PAYME_ENV_VARIABLE_NAMES).toContain("PAYME_SECRET_KEY");
  });

  it("no request sends payme_client_key, the Secret Key or the Public Key; the seller id identifies the account", async () => {
    configure();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status_code: 0, sub_payme_id: "SUB-1", items: [] }), { status: 200 }));
    const { generatePayMeSubscription, cancelPayMeSubscription, getPayMeSubscription } = await import("./client");

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
    await getPayMeSubscription("SUB-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      const url = String(call[0]);
      const body = String((call[1] as { body: string }).body);
      expect(url.startsWith("https://sandbox.payme.io/api/")).toBe(true);
      expect(body).not.toContain("payme_client_key");
      expect(body).not.toContain(SECRET);
      expect(body).not.toContain(PUBLIC_KEY);
      expect(JSON.parse(body).seller_payme_id).toBe(SELLER);
    }
  });

  it("the Secret Key is scrubbed from any error text that leaves the client", async () => {
    configure();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status_code: 1, status_error_details: `bad credential ${SECRET} for ${SELLER}` }), { status: 200 }));
    const { cancelPayMeSubscription } = await import("./client");
    const error = await cancelPayMeSubscription("SUB-1").catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(SECRET);
    expect((error as Error).message).not.toContain(SELLER);
  });
});

describe("the Secret Key never reaches browser code", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
    }
    return out;
  }

  it("no \"use client\" file mentions the secret key, the seller secret or process.env.PAYME_*", () => {
    const clientFiles = walk(path.resolve(__dirname, "../..")).filter((file) => /^\s*["']use client["']/.test(fs.readFileSync(file, "utf8").slice(0, 200)));
    expect(clientFiles.length).toBeGreaterThan(10);
    for (const file of clientFiles) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/PAYME_SECRET_KEY|secretKey|process\.env\.PAYME_/);
    }
  });

  it("the only config field that is ever passed to a component is the public hosted-fields key", () => {
    for (const rel of ["app/business/trial/page.tsx", "app/business/dashboard/(chrome)/subscription/page.tsx"]) {
      const source = fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
      expect(source, rel).not.toMatch(/secretKey|sellerId|webhookSecret/);
      expect(source, rel).toContain("hostedFieldsKey={payMeConfig.hostedFieldsKey}");
    }
  });
});
