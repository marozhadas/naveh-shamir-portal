import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sessionUser = vi.fn();
vi.mock("@/lib/supabase/server-client", () => ({ getSupabaseSessionUser: () => sessionUser() }));
const registrationPayment = vi.fn();
vi.mock("@/lib/sumit/registration-access", () => ({ getSumitRegistrationPayment: (...args: unknown[]) => registrationPayment(...args) }));
const find = vi.fn();
const findSaved = vi.fn();
vi.mock("@/repositories/supabase-subscription-service", () => ({
  findRegistrationAwaitingPaymentMethod: (...args: unknown[]) => find(...args),
  findRegistrationWithSavedPaymentMethod: (...args: unknown[]) => findSaved(...args),
}));

import { getPaymentResume, getSavedCardNotice } from "./payment-resume";

const REGISTRATION = { registrationId: "reg-1", planTier: "plus" as const, billingInterval: "monthly" as const, businessName: "סטודיו נועה" };
const PAYMENT = { companyId: 123456, apiPublicKey: "public-key", testMode: true as const };

describe("getPaymentResume", () => {
  beforeEach(() => {
    sessionUser.mockReset();
    registrationPayment.mockReset();
    find.mockReset();
    sessionUser.mockResolvedValue({ id: "user-1", email: "owner@example.com" });
    registrationPayment.mockReturnValue(PAYMENT);
    find.mockResolvedValue(REGISTRATION);
  });

  it("offers the owner's own pending registration, found by the verified session user - never by an id from the browser", async () => {
    const resume = await getPaymentResume();
    expect(resume).toMatchObject({ registrationId: "reg-1", planTier: "plus", payment: PAYMENT });
    expect(find).toHaveBeenCalledWith("user-1");
    expect(getPaymentResume.length).toBe(0); // no parameters at all
  });

  it("nobody signed in: nothing is offered and nothing is looked up", async () => {
    sessionUser.mockResolvedValue(null);
    expect(await getPaymentResume()).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("an account that is not on SUMIT_TEST_EMAILS (or SUMIT is not the test organization) gets no card step and no lookup", async () => {
    registrationPayment.mockReturnValue(null);
    expect(await getPaymentResume()).toBeNull();
    expect(registrationPayment).toHaveBeenCalledWith("owner@example.com");
    expect(find).not.toHaveBeenCalled();
  });

  it("hands over only the CompanyID and the PUBLIC key - never a secret", async () => {
    const resume = await getPaymentResume();
    expect(Object.keys(resume!.payment).sort()).toEqual(["apiPublicKey", "companyId", "testMode"]);
    expect(JSON.stringify(resume)).not.toMatch(/apiKey"|secret/i);
  });

  it("7/8/9. nothing to complete (already has a card, approved, free): nothing is offered", async () => {
    find.mockResolvedValue(null);
    expect(await getPaymentResume()).toBeNull();
  });
});

describe("getSavedCardNotice (read only: 'the card is saved')", () => {
  beforeEach(() => {
    sessionUser.mockReset();
    registrationPayment.mockReset();
    findSaved.mockReset();
    sessionUser.mockResolvedValue({ id: "user-1", email: "owner@example.com" });
    registrationPayment.mockReturnValue(PAYMENT);
    findSaved.mockResolvedValue(REGISTRATION);
  });

  it("for the gated owner whose registration already has its card: only the business name, found by the verified session user", async () => {
    expect(await getSavedCardNotice()).toEqual({ businessName: "סטודיו נועה" });
    expect(findSaved).toHaveBeenCalledWith("user-1");
  });

  it("nobody else learns anything: signed out, or not on the SUMIT test list -> null and nothing is read", async () => {
    sessionUser.mockResolvedValue(null);
    expect(await getSavedCardNotice()).toBeNull();
    sessionUser.mockResolvedValue({ id: "user-2", email: "stranger@example.com" });
    registrationPayment.mockReturnValue(null);
    expect(await getSavedCardNotice()).toBeNull();
    expect(findSaved).not.toHaveBeenCalled();
  });

  it("no saved card -> null", async () => {
    findSaved.mockResolvedValue(null);
    expect(await getSavedCardNotice()).toBeNull();
  });
});
