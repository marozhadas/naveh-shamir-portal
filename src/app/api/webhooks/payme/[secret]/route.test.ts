import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const processMock = vi.fn();
vi.mock("@/lib/payme/process-callback", () => ({ processPayMeCallback: (...args: unknown[]) => processMock(...args) }));

const SECRET = "s".repeat(40);
const ENV_KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET"] as const;

function configure() {
  process.env.PAYME_ENV = "sandbox";
  process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER";
  process.env.PAYME_HOSTED_FIELDS_KEY = "hosted-key-test";
  process.env.PAYME_WEBHOOK_SECRET = SECRET;
}

function request(body: string): Request {
  return new Request("https://example.test/api/webhooks/payme/x", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
}

describe("POST /api/webhooks/payme/[secret]", () => {
  beforeEach(() => {
    processMock.mockReset();
    processMock.mockResolvedValue({ httpStatus: 200, outcome: "processed" });
  });
  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("does not exist (404) while PayMe is not configured", async () => {
    const { POST } = await import("./route");
    const response = await POST(request("notify_type=sub-failure&sub_payme_id=X"), { params: Promise.resolve({ secret: SECRET }) });
    expect(response.status).toBe(404);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret with a plain 404 and never processes the body", async () => {
    configure();
    const { POST } = await import("./route");
    for (const wrong of ["wrong", "s".repeat(39), "s".repeat(41), ""]) {
      const response = await POST(request("notify_type=sub-failure&sub_payme_id=X"), { params: Promise.resolve({ secret: wrong }) });
      expect(response.status).toBe(404);
    }
    expect(processMock).not.toHaveBeenCalled();
  });

  it("processes a callback that carries the right secret", async () => {
    configure();
    const { POST } = await import("./route");
    const response = await POST(request("notify_type=sub-iteration-success&sub_payme_id=SUB1"), { params: Promise.resolve({ secret: SECRET }) });
    expect(response.status).toBe(200);
    expect(processMock).toHaveBeenCalledWith("notify_type=sub-iteration-success&sub_payme_id=SUB1");
  });

  it("answers PayMe with the processor's status (503 = please retry)", async () => {
    configure();
    processMock.mockResolvedValue({ httpStatus: 503, outcome: "failed" });
    const { POST } = await import("./route");
    const response = await POST(request("notify_type=sub-failure&sub_payme_id=SUB1"), { params: Promise.resolve({ secret: SECRET }) });
    expect(response.status).toBe(503);
  });

  it("refuses oversized bodies and GET requests", async () => {
    configure();
    const { POST, GET } = await import("./route");
    const huge = await POST(request("a=" + "x".repeat(25_000)), { params: Promise.resolve({ secret: SECRET }) });
    expect(huge.status).toBe(413);
    expect(processMock).not.toHaveBeenCalled();
    expect(GET().status).toBe(404);
  });
});
