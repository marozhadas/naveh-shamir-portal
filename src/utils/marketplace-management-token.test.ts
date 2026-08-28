import { describe, expect, it } from "vitest";
import { buildManagementUrl, generateManagementToken, hashManagementToken } from "./marketplace-management-token";

describe("generateManagementToken", () => {
  it("returns a 64-character hex string (32 bytes)", () => {
    const token = generateManagementToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never returns the same token twice", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateManagementToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("hashManagementToken", () => {
  it("is deterministic — the same raw token always hashes to the same value", () => {
    const token = generateManagementToken();
    expect(hashManagementToken(token)).toBe(hashManagementToken(token));
  });

  it("produces a 64-character hex SHA-256 digest", () => {
    expect(hashManagementToken("anything")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different tokens hash to different values", () => {
    const a = generateManagementToken();
    const b = generateManagementToken();
    expect(hashManagementToken(a)).not.toBe(hashManagementToken(b));
  });

  it("the hash never equals the raw token itself", () => {
    const token = generateManagementToken();
    expect(hashManagementToken(token)).not.toBe(token);
  });
});

describe("buildManagementUrl", () => {
  it("joins the origin and token into a /marketplace/manage/ path", () => {
    expect(buildManagementUrl("https://example.com", "abc123")).toBe("https://example.com/marketplace/manage/abc123");
  });
});
