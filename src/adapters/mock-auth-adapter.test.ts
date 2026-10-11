import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined }));
const sessionUser = vi.hoisted(() => ({ current: null as { id: string; email: string } | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "demo-viewer" && cookieValue.current ? { value: cookieValue.current } : undefined) }),
}));
vi.mock("@/lib/supabase/server-client", () => ({ getSupabaseSessionUser: async () => sessionUser.current }));
// No service-role client in tests: a real owner is resolved with an empty owned-business list.
vi.mock("@/lib/supabase/admin-client", () => ({ createAdminSupabaseClient: () => ({}), isSupabaseAdminConfigured: () => false }));

import { MockAuthAdapter } from "./mock-auth-adapter";

describe("MockAuthAdapter demo-viewer cookie", () => {
  beforeEach(() => {
    cookieValue.current = undefined;
    sessionUser.current = null;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does NOT give a production visitor an identity from the demo-viewer cookie (even admin-1)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const key of ["admin-1", "owner-1"]) {
      cookieValue.current = key;
      expect(await new MockAuthAdapter().getCurrentUser()).toBeNull();
    }
  });

  it("still lets local development use the demo viewer", async () => {
    vi.stubEnv("NODE_ENV", "development");
    cookieValue.current = "owner-1";
    expect(await new MockAuthAdapter().getCurrentUser()).toMatchObject({ id: "owner-1", role: "business-owner" });
    cookieValue.current = "admin-1";
    expect(await new MockAuthAdapter().getCurrentUser()).toMatchObject({ id: "admin-1", role: "admin" });
  });

  it("keeps a real Supabase owner session working in production, and ignores a demo cookie next to it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    sessionUser.current = { id: "11111111-1111-1111-1111-111111111111", email: "owner@example.com" };
    cookieValue.current = "admin-1";
    const user = await new MockAuthAdapter().getCurrentUser();
    expect(user).toMatchObject({ id: "11111111-1111-1111-1111-111111111111", role: "business-owner" });
  });

  it("returns null for a production guest with no cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await new MockAuthAdapter().getCurrentUser()).toBeNull();
  });
});
