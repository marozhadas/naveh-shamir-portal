import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sessionUser = vi.fn();
vi.mock("@/lib/supabase/server-client", () => ({ getSupabaseSessionUser: () => sessionUser() }));
const registrantConfig = vi.fn();
vi.mock("@/lib/payme/flow-access", () => ({ getPayMeConfigForRegistrant: (...args: unknown[]) => registrantConfig(...args) }));
const find = vi.fn();
vi.mock("@/repositories/supabase-subscription-service", () => ({ findRegistrationAwaitingPaymentMethod: (...args: unknown[]) => find(...args) }));

import { getPaymentResume } from "./payment-resume";

const REGISTRATION = { registrationId: "reg-1", planTier: "plus" as const, billingInterval: "monthly" as const, businessName: "סטודיו נועה" };

describe("getPaymentResume", () => {
  beforeEach(() => {
    sessionUser.mockReset();
    registrantConfig.mockReset();
    find.mockReset();
    sessionUser.mockResolvedValue({ id: "user-1", email: "owner@example.com" });
    registrantConfig.mockResolvedValue({ env: "live", hostedFieldsKey: "public-key" });
    find.mockResolvedValue(REGISTRATION);
  });

  it("offers the owner's own pending registration, found by the verified session user - never by an id from the browser", async () => {
    const resume = await getPaymentResume();
    expect(resume).toMatchObject({ registrationId: "reg-1", planTier: "plus", hostedFieldsKey: "public-key", testMode: false });
    expect(find).toHaveBeenCalledWith("user-1");
    expect(getPaymentResume.length).toBe(0); // no parameters at all
  });

  it("nobody signed in: nothing is offered and nothing is looked up", async () => {
    sessionUser.mockResolvedValue(null);
    expect(await getPaymentResume()).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("10. sandbox: an account that is not on the test list gets no Hosted Fields and no lookup", async () => {
    registrantConfig.mockResolvedValue(null);
    expect(await getPaymentResume()).toBeNull();
    expect(registrantConfig).toHaveBeenCalledWith("owner@example.com");
    expect(find).not.toHaveBeenCalled();
  });

  it("sandbox: a listed account gets the test-mode form", async () => {
    registrantConfig.mockResolvedValue({ env: "sandbox", hostedFieldsKey: "sandbox-public-key" });
    expect(await getPaymentResume()).toMatchObject({ testMode: true, hostedFieldsKey: "sandbox-public-key" });
  });

  it("7/8/9. nothing to complete (already has a card, approved, free): nothing is offered", async () => {
    find.mockResolvedValue(null);
    expect(await getPaymentResume()).toBeNull();
  });
});
