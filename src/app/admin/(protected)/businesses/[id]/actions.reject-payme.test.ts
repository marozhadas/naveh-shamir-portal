import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const auth = { ok: true };
vi.mock("@/lib/admin-session", () => ({ isAdminAuthenticated: async () => auth.ok, getAdminId: async () => "admin-1" }));
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => true, createAdminSupabaseClient: () => ({}) }));

const order: string[] = [];
const getRegistrationById = vi.fn();
const updateStatus = vi.fn(async () => {
  order.push("status-updated");
});
vi.mock("@/lib/admin/business-registrations", () => ({
  deleteRegistration: vi.fn(),
  getRegistrationById: (...args: unknown[]) => getRegistrationById(...args),
  getRegistrationSubscriptionRow: vi.fn(),
  rotateBusinessManagementToken: vi.fn(),
  updateRegistrationActivePlan: vi.fn(),
  updateRegistrationOffer: vi.fn(),
  updateRegistrationBillingTest: vi.fn(),
  updateRegistrationDashboardAccessConsent: vi.fn(),
  updateRegistrationFields: vi.fn(),
  updateRegistrationSlug: vi.fn(),
  updateRegistrationStatus: (...args: unknown[]) => (updateStatus as unknown as (...a: unknown[]) => Promise<void>)(...args),
}));
vi.mock("@/lib/admin/audit-log", () => ({ recordAuditLog: vi.fn() }));
vi.mock("@/lib/admin/notifications", () => ({ getNotificationById: vi.fn(), resolveNotificationForEntity: vi.fn() }));
vi.mock("@/lib/email/send-registration-notification-email", () => ({ sendRegistrationNotificationEmail: vi.fn() }));
vi.mock("@/repositories/business-media-service", () => ({ deleteBusinessMediaByUrl: vi.fn(), uploadBusinessMedia: vi.fn() }));
vi.mock("@/repositories/business-slug-redirect-repository", () => ({ recordSlugRedirect: vi.fn() }));

const cancelForRejection = vi.fn();
vi.mock("@/repositories/supabase-subscription-service", () => ({
  cancelPayMeSubscriptionForRejection: (...args: unknown[]) => cancelForRejection(...args),
}));

const cancelSumitTrial = vi.fn();
vi.mock("@/repositories/sumit-trial-cancellation", () => ({ cancelSumitTrialForRejection: (...args: unknown[]) => cancelSumitTrial(...args) }));

const ID = "11111111-1111-1111-1111-111111111111";

function reason(text: string): FormData {
  const formData = new FormData();
  formData.set("reason", text);
  return formData;
}

describe("rejectRegistrationAction - a business that went live through payment", () => {
  beforeEach(() => {
    order.length = 0;
    getRegistrationById.mockReset();
    updateStatus.mockClear();
    cancelForRejection.mockReset();
    getRegistrationById.mockResolvedValue({ id: ID, business_name: "עסק בדיקה" });
    cancelForRejection.mockImplementation(async () => {
      order.push("payme-cancelled");
      return { success: true, hadSubscription: true };
    });
    auth.ok = true;
    cancelSumitTrial.mockReset();
    cancelSumitTrial.mockImplementation(async () => {
      order.push("sumit-trial-checked");
      return { success: true, outcome: "none" };
    });
  });

  it("stops the PayMe subscription BEFORE the status becomes rejected", async () => {
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("תוכן לא מתאים"));
    expect(result).toEqual({ error: null, success: true });
    expect(cancelForRejection).toHaveBeenCalledWith(ID, "admin-1");
    expect(order).toEqual(["payme-cancelled", "sumit-trial-checked", "status-updated"]);
  });

  it("if PayMe cannot cancel, the business is NOT rejected (it would keep being billed)", async () => {
    cancelForRejection.mockResolvedValue({ success: false, reason: "payme-error" });
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("תוכן לא מתאים"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("PayMe");
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("a SUMIT trial is ended BEFORE the status becomes rejected, and the order is PayMe check, SUMIT trial, status", async () => {
    cancelSumitTrial.mockImplementation(async () => {
      order.push("sumit-trial-canceled");
      return { success: true, outcome: "canceled" };
    });
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("עסק בדיקה"));
    expect(result).toEqual({ error: null, success: true });
    expect(cancelSumitTrial).toHaveBeenCalledWith(ID, "admin-1");
    expect(order).toEqual(["payme-cancelled", "sumit-trial-canceled", "status-updated"]);
  });

  it("a SUMIT subscription that was billed or is not an unbilled trial STOPS the rejection: nothing is rejected, the message says to handle it manually", async () => {
    cancelSumitTrial.mockResolvedValue({ success: false, reason: "not-eligible" });
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("עסק בדיקה"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("ידנית");
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("if the SUMIT trial cannot be ended, the business is NOT rejected (it would keep a live trial)", async () => {
    cancelSumitTrial.mockResolvedValue({ success: false, reason: "unknown-error" });
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("עסק בדיקה"));
    expect(result.success).toBe(false);
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("if the trial was ended but the rejection could not be saved, it is NOT reported as success, and the message says running it again is safe", async () => {
    cancelSumitTrial.mockResolvedValue({ success: true, outcome: "canceled" });
    updateStatus.mockRejectedValueOnce(new Error("db down"));
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("עסק בדיקה"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("הסתיים");
    expect(result.error).toContain("בטוחה להרצה חוזרת");
  });

  it("running the rejection again after that failure finishes the job: the trial is 'already-ended' and the status is saved", async () => {
    cancelSumitTrial.mockResolvedValue({ success: true, outcome: "already-ended" });
    const { rejectRegistrationAction } = await import("./actions");
    expect(await rejectRegistrationAction(ID, { error: null, success: false }, reason("עסק בדיקה"))).toEqual({ error: null, success: true });
    expect(updateStatus).toHaveBeenCalledTimes(1);
  });

  it("an APPROVED business (a public one) can be rejected through the same action: the trial is ended first, then the status", async () => {
    getRegistrationById.mockResolvedValue({ id: ID, business_name: "עסק בדיקה", status: "approved" });
    cancelSumitTrial.mockImplementation(async () => {
      order.push("sumit-trial-canceled");
      return { success: true, outcome: "canceled" };
    });
    const { rejectRegistrationAction } = await import("./actions");
    expect(await rejectRegistrationAction(ID, { error: null, success: false }, reason("עסק בדיקה"))).toEqual({ error: null, success: true });
    expect(order).toEqual(["payme-cancelled", "sumit-trial-canceled", "status-updated"]);
    expect(updateStatus).toHaveBeenCalledWith(ID, "rejected", { rejection_reason: "עסק בדיקה" });
  });

  it("the admin check stays on the server: without an admin session nothing is cancelled or rejected", async () => {
    auth.ok = false;
    const { rejectRegistrationAction } = await import("./actions");
    await expect(rejectRegistrationAction(ID, { error: null, success: false }, reason("עסק בדיקה"))).rejects.toThrow("Not authenticated");
    expect(cancelForRejection).not.toHaveBeenCalled();
    expect(cancelSumitTrial).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("still needs a reason, and touches nothing without one", async () => {
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("x"));
    expect(result.success).toBe(false);
    expect(cancelForRejection).not.toHaveBeenCalled();
    expect(cancelSumitTrial).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("if PayMe cannot cancel, the SUMIT check is not even reached", async () => {
    cancelForRejection.mockResolvedValue({ success: false, reason: "payme-error" });
    const { rejectRegistrationAction } = await import("./actions");
    await rejectRegistrationAction(ID, { error: null, success: false }, reason("תוכן לא מתאים"));
    expect(cancelSumitTrial).not.toHaveBeenCalled();
  });
});
