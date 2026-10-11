import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/admin-session", () => ({ isAdminAuthenticated: async () => true, getAdminId: async () => "admin-1" }));
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
  });

  it("stops the PayMe subscription BEFORE the status becomes rejected", async () => {
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("תוכן לא מתאים"));
    expect(result).toEqual({ error: null, success: true });
    expect(cancelForRejection).toHaveBeenCalledWith(ID, "admin-1");
    expect(order).toEqual(["payme-cancelled", "status-updated"]);
  });

  it("if PayMe cannot cancel, the business is NOT rejected (it would keep being billed)", async () => {
    cancelForRejection.mockResolvedValue({ success: false, reason: "payme-error" });
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("תוכן לא מתאים"));
    expect(result.success).toBe(false);
    expect(result.error).toContain("PayMe");
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("still needs a reason, and touches nothing without one", async () => {
    const { rejectRegistrationAction } = await import("./actions");
    const result = await rejectRegistrationAction(ID, { error: null, success: false }, reason("x"));
    expect(result.success).toBe(false);
    expect(cancelForRejection).not.toHaveBeenCalled();
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
