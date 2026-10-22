import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/admin-session", () => ({ isAdminAuthenticated: async () => true, getAdminId: async () => "admin-1" }));
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => true, createAdminSupabaseClient: () => ({}) }));

const paymeEnv = { value: "sandbox" as "sandbox" | "live" | null };
vi.mock("@/lib/payme/config", () => ({ getPayMeConfig: () => (paymeEnv.value ? { env: paymeEnv.value } : null) }));

const getRegistrationById = vi.fn();
const getRegistrationSubscriptionRow = vi.fn();
const updateStatus = vi.fn();
const updateOffer = vi.fn();
vi.mock("@/lib/admin/business-registrations", () => ({
  deleteRegistration: vi.fn(),
  getRegistrationById: (...args: unknown[]) => getRegistrationById(...args),
  getRegistrationSubscriptionRow: (...args: unknown[]) => getRegistrationSubscriptionRow(...args),
  rotateBusinessManagementToken: vi.fn(),
  updateRegistrationActivePlan: vi.fn(),
  updateRegistrationOffer: (...args: unknown[]) => updateOffer(...args),
  updateRegistrationBillingTest: vi.fn(),
  updateRegistrationDashboardAccessConsent: vi.fn(),
  updateRegistrationFields: vi.fn(),
  updateRegistrationSlug: vi.fn(),
  updateRegistrationStatus: (...args: unknown[]) => updateStatus(...args),
}));
const recordAuditLog = vi.fn();
vi.mock("@/lib/admin/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
const resolveNotification = vi.fn();
vi.mock("@/lib/admin/notifications", () => ({ getNotificationById: vi.fn(), resolveNotificationForEntity: (...args: unknown[]) => resolveNotification(...args) }));
vi.mock("@/lib/email/send-registration-notification-email", () => ({ sendRegistrationNotificationEmail: vi.fn() }));
vi.mock("@/repositories/business-media-service", () => ({ deleteBusinessMediaByUrl: vi.fn(), uploadBusinessMedia: vi.fn() }));
vi.mock("@/repositories/business-slug-redirect-repository", () => ({ recordSlugRedirect: vi.fn() }));

const getSavedPaymentMethodInfo = vi.fn();
const activate = vi.fn();
vi.mock("@/repositories/supabase-subscription-service", () => ({
  cancelPayMeSubscriptionForRejection: vi.fn(),
  getSavedPaymentMethodInfo: (...args: unknown[]) => getSavedPaymentMethodInfo(...args),
  activateRegistrationOnApproval: (...args: unknown[]) => activate(...args),
}));

const activateSumit = vi.fn();
vi.mock("@/repositories/sumit-trial-activation", () => ({ activateSumitTrialOnApproval: (...args: unknown[]) => activateSumit(...args) }));

const ID = "11111111-1111-1111-1111-111111111111";
const pending = (overrides: Record<string, unknown> = {}) => ({ id: ID, business_name: "עסק בדיקה", status: "pending", plan_tier: "plus", offer_code: "launch_standard", ...overrides });

describe("approveRegistrationAction - the admin's approval IS the activation", () => {
  beforeEach(() => {
    for (const fn of [getRegistrationById, getRegistrationSubscriptionRow, updateStatus, updateOffer, recordAuditLog, resolveNotification, getSavedPaymentMethodInfo, activate]) fn.mockReset();
    paymeEnv.value = "sandbox";
    getRegistrationById.mockResolvedValue(pending());
    getSavedPaymentMethodInfo.mockResolvedValue({ hasPaymentMethod: true, cardMask: "411111******1111" });
    getRegistrationSubscriptionRow.mockResolvedValue(null);
    activate.mockResolvedValue({ success: true, subscription: {}, offerCode: "launch_standard", trialDays: 30 });
  });

  async function approve() {
    const { approveRegistrationAction } = await import("./actions");
    return approveRegistrationAction(ID);
  }

  it("a pending business with a saved card: the trial is started by the approval itself, which also resolves the notification and writes the audit entry", async () => {
    expect(await approve()).toEqual({ status: "success", trialStarted: true, trialDays: 30 });
    expect(activate).toHaveBeenCalledWith(ID, "admin-1");
    expect(updateStatus).not.toHaveBeenCalled(); // the activation approves, only after PayMe created the subscription
    expect(resolveNotification).toHaveBeenCalled();
    expect(recordAuditLog.mock.calls[0][0]).toMatchObject({ action: "business-approved", metadata: { trialStarted: true, trialDays: 30, offerCode: "launch_standard" } });
  });

  it("Pilot: the activation reports 90 days and the audit entry says so", async () => {
    activate.mockResolvedValue({ success: true, subscription: {}, offerCode: "pilot_2026", trialDays: 90 });
    expect(await approve()).toEqual({ status: "success", trialStarted: true, trialDays: 90 });
    expect(recordAuditLog.mock.calls[0][0]).toMatchObject({ metadata: { trialDays: 90, offerCode: "pilot_2026" } });
  });

  it("when PayMe (or any activation step) fails the admin gets a clear message and NOTHING else happens", async () => {
    activate.mockResolvedValue({ success: false, reason: "payme-rejected" });
    const result = await approve();
    expect(result.status).toBe("error");
    expect(result.status === "error" && result.message).toContain("יצירת המנוי ב-PayMe נכשלה");
    expect(result.status === "error" && result.message).toContain("נשאר ממתין");
    expect(updateStatus).not.toHaveBeenCalled();
    expect(resolveNotification).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("every activation failure maps to a message that says the business stays pending", async () => {
    for (const reason of ["not-pending", "no-owner", "invalid-slug", "no-payment-method", "payme-not-configured", "already-exists", "invalid-plan", "payme-rejected", "approve-failed", "unknown-error"]) {
      activate.mockResolvedValue({ success: false, reason });
      const result = await approve();
      expect(result.status, reason).toBe("error");
      expect(result.status === "error" && result.message.length > 10, reason).toBe(true);
    }
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("PayMe is live and the paid business never saved a card: blocked, nothing is activated or approved", async () => {
    paymeEnv.value = "live";
    getSavedPaymentMethodInfo.mockResolvedValue({ hasPaymentMethod: false, cardMask: null });
    const result = await approve();
    expect(result.status).toBe("error");
    expect(activate).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("a saved card but PayMe no longer configured: blocked", async () => {
    paymeEnv.value = null;
    expect((await approve()).status).toBe("error");
    expect(activate).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("a free registration keeps the earlier behaviour: status only", async () => {
    getRegistrationById.mockResolvedValue(pending({ plan_tier: "free" }));
    getSavedPaymentMethodInfo.mockResolvedValue({ hasPaymentMethod: false, cardMask: null });
    expect(await approve()).toEqual({ status: "success", trialStarted: false, trialDays: null });
    expect(updateStatus).toHaveBeenCalledWith(ID, "approved");
    expect(activate).not.toHaveBeenCalled();
  });

  it("sandbox and no card (an ordinary registration, payment step not shown): the earlier behaviour, status only", async () => {
    getSavedPaymentMethodInfo.mockResolvedValue({ hasPaymentMethod: false, cardMask: null });
    expect((await approve()).status).toBe("success");
    expect(updateStatus).toHaveBeenCalledWith(ID, "approved");
    expect(activate).not.toHaveBeenCalled();
  });
});

describe("approveRegistrationAction - a saved SUMIT card: the approval starts the TRIAL only (no charge, no payment-provider call)", () => {
  beforeEach(() => {
    for (const fn of [getRegistrationById, getRegistrationSubscriptionRow, updateStatus, recordAuditLog, resolveNotification, getSavedPaymentMethodInfo, activate, activateSumit]) fn.mockReset();
    getRegistrationById.mockResolvedValue(pending());
    getSavedPaymentMethodInfo.mockResolvedValue({ hasPaymentMethod: true, cardMask: "XXXXXXXXXXXX0772", provider: "sumit" });
    activateSumit.mockResolvedValue({ success: true, subscription: {}, offerCode: "launch_standard", trialDays: 30, nextBillingAt: "2026-11-21T10:00:00.000Z" });
  });

  async function approve() {
    const { approveRegistrationAction } = await import("./actions");
    return approveRegistrationAction(ID);
  }

  it.each([["sandbox"], ["live"], [null]] as const)("works whatever PayMe's state is (%s): SUMIT does not depend on PayMe, and the PayMe activation is never used", async (env) => {
    paymeEnv.value = env as "sandbox" | "live" | null;
    expect(await approve()).toEqual({ status: "success", trialStarted: true, trialDays: 30 });
    expect(activateSumit).toHaveBeenCalledWith(ID, "admin-1");
    expect(activate).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled(); // the activation approves, atomically with the trial row
    expect(resolveNotification).toHaveBeenCalled();
    expect(recordAuditLog.mock.calls[0][0]).toMatchObject({ action: "business-approved", metadata: { trialStarted: true, trialDays: 30, offerCode: "launch_standard", provider: "sumit", charged: false } });
  });

  it("Pilot: 90 days, from the offer on the business", async () => {
    activateSumit.mockResolvedValue({ success: true, subscription: {}, offerCode: "pilot_2026", trialDays: 90, nextBillingAt: "2027-01-20T10:00:00.000Z" });
    expect(await approve()).toEqual({ status: "success", trialStarted: true, trialDays: 90 });
  });

  it("every failure keeps the business pending and says so; nothing is resolved or audited; a failed approval does not talk about PayMe", async () => {
    for (const reason of ["not-found", "not-pending", "no-owner", "invalid-slug", "no-payment-method", "already-exists", "invalid-plan", "approve-failed", "unknown-error"]) {
      activateSumit.mockResolvedValue({ success: false, reason });
      const result = await approve();
      expect(result.status, reason).toBe("error");
      expect(result.status === "error" && result.message.length > 10, reason).toBe(true);
      expect(result.status === "error" && result.message, reason).not.toMatch(/payme/i);
    }
    expect(updateStatus).not.toHaveBeenCalled();
    expect(resolveNotification).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("a PayMe card still follows the PayMe rules (blocked while PayMe is not configured)", async () => {
    paymeEnv.value = null;
    getSavedPaymentMethodInfo.mockResolvedValue({ hasPaymentMethod: true, cardMask: "411111******1111", provider: "payme" });
    expect((await approve()).status).toBe("error");
    expect(activateSumit).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
});

describe("the admin chooses Regular or Pilot while the business is still pending (after step 6, before approving)", () => {
  beforeEach(() => {
    updateOffer.mockReset();
    getRegistrationById.mockReset();
    getRegistrationSubscriptionRow.mockReset();
    recordAuditLog.mockReset();
    getRegistrationById.mockResolvedValue(pending());
  });

  async function change(offerCode: "launch_standard" | "pilot_2026") {
    const { changeBusinessOfferAction } = await import("./actions");
    return changeBusinessOfferAction({ businessId: ID, offerCode });
  }

  it("Regular -> Pilot is allowed while there is no subscription, and audited", async () => {
    getRegistrationSubscriptionRow.mockResolvedValue(null);
    const result = await change("pilot_2026");
    expect(result.status).toBe("success");
    expect(updateOffer).toHaveBeenCalledWith(ID, "pilot_2026");
    expect(recordAuditLog.mock.calls[0][0]).toMatchObject({ action: "business-pilot-assigned" });
  });

  it("Pilot -> Regular is allowed too", async () => {
    getRegistrationById.mockResolvedValue(pending({ offer_code: "pilot_2026" }));
    getRegistrationSubscriptionRow.mockResolvedValue(null);
    expect((await change("launch_standard")).status).toBe("success");
    expect(updateOffer).toHaveBeenCalledWith(ID, "launch_standard");
  });

  it("once the subscription exists (the trial started) the offer is locked", async () => {
    getRegistrationSubscriptionRow.mockResolvedValue({ id: "sub-1" });
    const result = await change("pilot_2026");
    expect(result.status).toBe("locked");
    expect(updateOffer).not.toHaveBeenCalled();
  });
});
