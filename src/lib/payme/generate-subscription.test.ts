import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// LEGACY: PayMe is dormant (see lib/payme/dormant.ts). This file tests the dormant code as if it were enabled, so it stays covered for rollback/debug.
vi.mock("@/lib/payme/dormant", () => ({ isPayMeProviderActive: () => true }));

const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";
const INPUT = {
  buyerKey: TOKEN,
  merchantSubscriptionId: "11111111-1111-1111-1111-111111111111",
  priceAgorot: 3900,
  iterationType: 3 as const,
  startDate: "07/11/2026",
  description: "Plus",
  callbackUrl: "https://example.test/api/webhooks/payme/x",
};

describe("generatePayMeSubscription - the Hosted Fields token is the buyer_key, nothing is charged now", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.PAYME_ENV = "sandbox";
    process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER-789";
    process.env.PAYME_HOSTED_FIELDS_KEY = "public-key-for-browser-456";
    process.env.PAYME_WEBHOOK_SECRET = "w".repeat(40);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"]) delete process.env[key];
  });

  it("sends the token as buyer_key, the price in agorot, and sub_start_date as dd/mm/yyyy - in ONE request, to generate-subscription only", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status_code: 0, sub_payme_id: "SUB-123456", sub_next_date: "2026-11-07 00:00:00" }), { status: 200 }));
    const { generatePayMeSubscription } = await import("./client");

    const created = await generatePayMeSubscription(INPUT);

    expect(created.subPaymeId).toBe("SUB-123456");
    // No immediate charge: the only call is the subscription creation (no sale / capture / generate-sale endpoint).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://sandbox.payme.io/api/generate-subscription");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.buyer_key).toBe(TOKEN);
    expect(body.sub_price).toBe(3900);
    expect(body.sub_start_date).toBe("07/11/2026");
    expect(body.sub_start_date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(body.seller_payme_id).toBe("MPL-TEST-SELLER-789");
    expect(body.sub_iteration_type).toBe(3);
    expect(JSON.stringify(body)).not.toMatch(/cvv|cvc|card_number|expiry|expiration/i);
  });

  it("a response without a sub_payme_id is an error - the caller can never treat it as a created subscription", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status_code: 0 }), { status: 200 }));
    const { generatePayMeSubscription } = await import("./client");
    await expect(generatePayMeSubscription(INPUT)).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("a malformed sub_payme_id is rejected too", async () => {
    for (const bad of ["", "   ", "has space", 12345, null]) {
      fetchMock.mockImplementation(async () => new Response(JSON.stringify({ status_code: 0, sub_payme_id: bad }), { status: 200 }));
      const { generatePayMeSubscription } = await import("./client");
      await expect(generatePayMeSubscription(INPUT)).rejects.toMatchObject({ kind: "invalid-response" });
    }
  });

  it("refuses, without calling PayMe, a start date that is not dd/mm/yyyy, a price under PayMe's minimum, or a missing token", async () => {
    const { generatePayMeSubscription } = await import("./client");
    await expect(generatePayMeSubscription({ ...INPUT, startDate: "07/11/2026 10:00" })).rejects.toThrow();
    await expect(generatePayMeSubscription({ ...INPUT, startDate: "2026-11-07" })).rejects.toThrow();
    await expect(generatePayMeSubscription({ ...INPUT, priceAgorot: 100 })).rejects.toThrow();
    await expect(generatePayMeSubscription({ ...INPUT, priceAgorot: 3900.5 })).rejects.toThrow();
    await expect(generatePayMeSubscription({ ...INPUT, buyerKey: "" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
