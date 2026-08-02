import { afterEach, describe, expect, it, vi } from "vitest";

// admin-session.ts is guarded by the "server-only" package, which throws when imported outside a
// real Next.js server-component bundling context (vitest's node environment isn't one). Stubbing
// it to a no-op is the standard way to unit-test server-only modules.
vi.mock("server-only", () => ({}));

const { checkAdminPassword, getAdminConfigError, getAdminId } = await import("./admin-session");

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

describe("getAdminConfigError", () => {
  it("is null outside production even without ADMIN_PASSWORD", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(getAdminConfigError()).toBeNull();
  });

  it("refuses a missing ADMIN_PASSWORD in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(getAdminConfigError()).toContain("ADMIN_PASSWORD");
  });

  it("refuses the insecure default '1234' in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "1234");
    expect(getAdminConfigError()).not.toBeNull();
  });

  it("accepts a real password in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "a-real-secret-value");
    expect(getAdminConfigError()).toBeNull();
  });
});

describe("checkAdminPassword", () => {
  it("rejects any password once production has an insecure default configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "1234");
    expect(checkAdminPassword("1234")).toBe(false);
  });

  it("accepts the configured password outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_PASSWORD", "correct-horse");
    expect(checkAdminPassword("correct-horse")).toBe(true);
    expect(checkAdminPassword("wrong")).toBe(false);
  });
});

describe("getAdminId", () => {
  it("is deterministic for the same password", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_PASSWORD", "same-password");
    expect(getAdminId()).toBe(getAdminId());
  });

  it("changes when the password changes", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_PASSWORD", "password-one");
    const first = getAdminId();
    vi.stubEnv("ADMIN_PASSWORD", "password-two");
    expect(getAdminId()).not.toBe(first);
  });

  it("looks like a UUID", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_PASSWORD", "some-password");
    expect(getAdminId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
