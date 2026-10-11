import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { findLiveReadinessIssues } from "./live-readiness";

const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";
const row = (id: string, status: string, plan_tier: string) => ({ id, business_name: `עסק ${id}`, plan_tier, status });
const cards = (...ids: string[]) => new Set(ids);

describe("findLiveReadinessIssues", () => {
  it("1. a paid pending business without a saved payment method is a Live readiness issue", () => {
    expect(findLiveReadinessIssues([row("a", "pending", "plus"), row("b", "pending", "premium")], cards())).toEqual([
      { id: "a", businessName: "עסק a", planTier: "plus" },
      { id: "b", businessName: "עסק b", planTier: "premium" },
    ]);
  });

  it("2. a paid pending business WITH a saved payment method is not flagged", () => {
    expect(findLiveReadinessIssues([row("a", "pending", "plus"), row("b", "pending", "premium")], cards("a", "b"))).toEqual([]);
  });

  it("3. a free pending business is not flagged", () => {
    expect(findLiveReadinessIssues([row("a", "pending", "free")], cards())).toEqual([]);
  });

  it("4. an approved (or rejected) business is not flagged, with or without a card", () => {
    expect(findLiveReadinessIssues([row("a", "approved", "plus"), row("b", "approved", "premium"), row("c", "rejected", "plus")], cards())).toEqual([]);
  });

  it("only the ones that are really missing a card are reported, in a mixed list", () => {
    const issues = findLiveReadinessIssues([row("a", "pending", "plus"), row("b", "pending", "plus"), row("c", "pending", "free"), row("d", "approved", "plus")], cards("b"));
    expect(issues.map((issue) => issue.id)).toEqual(["a"]);
  });

  it("5. the report carries ids, names and plan only - never a token or anything about a card", () => {
    const issues = findLiveReadinessIssues([{ ...row("a", "pending", "plus"), provider_token: TOKEN, card_mask: "411111******1111" } as never], cards());
    expect(Object.keys(issues[0]).sort()).toEqual(["businessName", "id", "planTier"]);
    expect(JSON.stringify(issues)).not.toContain(TOKEN);
    expect(JSON.stringify(issues)).not.toContain("411111");
  });
});

describe("getLiveReadinessReport (read-only, never selects the buyer_key)", () => {
  const calls: { table: string; select?: string }[] = [];
  const writes: string[] = [];
  const state = { registrations: [] as unknown[], methods: [] as unknown[] };

  beforeEach(() => {
    calls.length = 0;
    writes.length = 0;
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin-client", () => ({
      isSupabaseAdminConfigured: () => true,
      createAdminSupabaseClient: () => ({
        from: (table: string) => {
          const call: { table: string; select?: string } = { table };
          calls.push(call);
          const q: Record<string, unknown> = {
            select(columns: string) {
              call.select = columns;
              return q;
            },
            eq: () => q,
            in: () => q,
            order: async () => ({ data: state.registrations, error: null }),
            insert: () => writes.push("insert"),
            update: () => writes.push("update"),
            upsert: () => writes.push("upsert"),
            delete: () => writes.push("delete"),
            then: (resolve: (value: unknown) => void) => resolve({ data: state.methods, error: null }),
          };
          return q;
        },
      }),
    }));
  });

  async function report() {
    const { getLiveReadinessReport } = await import("@/lib/admin/live-readiness");
    return getLiveReadinessReport();
  }

  it("flags a pending paid business with no card, counts it, and changes nothing", async () => {
    state.registrations = [row("a", "pending", "plus"), row("b", "pending", "premium")];
    state.methods = [{ business_registration_id: "b", provider_token: TOKEN, card_mask: "411111******1111" }];
    const result = await report();
    expect(result).toEqual({ checked: true, ready: false, issueCount: 1, issues: [{ id: "a", businessName: "עסק a", planTier: "plus" }] });
    expect(writes).toEqual([]); // no record changed, no card created, no subscription created
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("reads the payment-method table by registration id only - the token column is never selected", async () => {
    state.registrations = [row("a", "pending", "plus")];
    state.methods = [];
    await report();
    const methodsQuery = calls.find((call) => call.table === "billing_payment_methods");
    expect(methodsQuery?.select).toBe("business_registration_id");
    expect(calls.map((call) => call.select).join(" ")).not.toContain("provider_token");
  });

  it("no pending paid businesses: ready, and the payment-method table is not even read", async () => {
    state.registrations = [];
    expect(await report()).toEqual({ checked: true, ready: true, issueCount: 0, issues: [] });
    expect(calls.some((call) => call.table === "billing_payment_methods")).toBe(false);
  });

  it("every pending paid business has a card: ready", async () => {
    state.registrations = [row("a", "pending", "plus")];
    state.methods = [{ business_registration_id: "a" }];
    expect(await report()).toEqual({ checked: true, ready: true, issueCount: 0, issues: [] });
  });
});
