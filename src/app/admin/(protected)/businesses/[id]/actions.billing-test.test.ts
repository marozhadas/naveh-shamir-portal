import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const isAdmin = vi.fn();
vi.mock("@/lib/admin-session", () => ({ isAdminAuthenticated: () => isAdmin(), getAdminId: async () => "admin-1" }));
vi.mock("@/lib/supabase/admin-client", () => ({ isSupabaseAdminConfigured: () => true, createAdminSupabaseClient: () => ({}) }));

const getRegistrationById = vi.fn();
const updateBillingTest = vi.fn();
vi.mock("@/lib/admin/business-registrations", () => ({
  deleteRegistration: vi.fn(),
  getRegistrationById: (...args: unknown[]) => getRegistrationById(...args),
  getRegistrationSubscriptionRow: vi.fn(),
  rotateBusinessManagementToken: vi.fn(),
  updateRegistrationActivePlan: vi.fn(),
  updateRegistrationOffer: vi.fn(),
  updateRegistrationBillingTest: (...args: unknown[]) => updateBillingTest(...args),
  updateRegistrationDashboardAccessConsent: vi.fn(),
  updateRegistrationFields: vi.fn(),
  updateRegistrationSlug: vi.fn(),
  updateRegistrationStatus: vi.fn(),
}));

const recordAuditLog = vi.fn();
vi.mock("@/lib/admin/audit-log", () => ({ recordAuditLog: (...args: unknown[]) => recordAuditLog(...args) }));
vi.mock("@/lib/admin/notifications", () => ({ getNotificationById: vi.fn(), resolveNotificationForEntity: vi.fn() }));
vi.mock("@/lib/email/send-registration-notification-email", () => ({ sendRegistrationNotificationEmail: vi.fn() }));
vi.mock("@/repositories/business-media-service", () => ({ deleteBusinessMediaByUrl: vi.fn(), uploadBusinessMedia: vi.fn() }));
vi.mock("@/repositories/business-slug-redirect-repository", () => ({ recordSlugRedirect: vi.fn() }));

const BUSINESS_ID = "11111111-1111-1111-1111-111111111111";
const plusBusiness = (enabled: boolean) => ({ id: BUSINESS_ID, business_name: "עסק בדיקה", plan_tier: "plus", billing_test_enabled: enabled });

describe("changeBusinessBillingTestAction", () => {
  beforeEach(() => {
    isAdmin.mockReset();
    getRegistrationById.mockReset();
    updateBillingTest.mockReset();
    recordAuditLog.mockReset();
    isAdmin.mockResolvedValue(true);
  });

  it("is admin-only: without an admin session nothing is read, changed or logged", async () => {
    isAdmin.mockResolvedValue(false);
    const { changeBusinessBillingTestAction } = await import("./actions");
    await expect(changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: true })).rejects.toThrow();
    expect(getRegistrationById).not.toHaveBeenCalled();
    expect(updateBillingTest).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean flag", async () => {
    const { changeBusinessBillingTestAction } = await import("./actions");
    const result = await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: "true" as never });
    expect(result.status).toBe("validation-error");
    expect(updateBillingTest).not.toHaveBeenCalled();
  });

  it("not found / Basic businesses cannot be switched", async () => {
    const { changeBusinessBillingTestAction } = await import("./actions");
    getRegistrationById.mockResolvedValue(null);
    expect((await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: true })).status).toBe("not-found");
    getRegistrationById.mockResolvedValue({ ...plusBusiness(false), plan_tier: "free" });
    expect((await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: true })).status).toBe("validation-error");
    expect(updateBillingTest).not.toHaveBeenCalled();
  });

  it("turning it on writes the flag and an audit entry (no secrets in the metadata)", async () => {
    getRegistrationById.mockResolvedValue(plusBusiness(false));
    const { changeBusinessBillingTestAction } = await import("./actions");
    const result = await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: true, reason: "בדיקת Sandbox ראשונה" });
    expect(result).toEqual({ status: "success", enabled: true });
    expect(updateBillingTest).toHaveBeenCalledWith(BUSINESS_ID, true);
    expect(recordAuditLog).toHaveBeenCalledTimes(1);
    const entry = recordAuditLog.mock.calls[0][0] as { adminId: string; action: string; entityId: string; metadata: Record<string, unknown> };
    expect(entry.adminId).toBe("admin-1");
    expect(entry.action).toBe("business-billing-test-changed");
    expect(entry.entityId).toBe(BUSINESS_ID);
    expect(entry.metadata).toMatchObject({ previousBillingTest: "כבוי", newBillingTest: "מופעל", reason: "בדיקת Sandbox ראשונה" });
    expect(JSON.stringify(entry.metadata)).not.toMatch(/key|secret|token/i);
  });

  it("turning it off is audited too; an unchanged value is a no-op with no audit noise", async () => {
    const { changeBusinessBillingTestAction } = await import("./actions");
    getRegistrationById.mockResolvedValue(plusBusiness(true));
    expect(await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: false })).toEqual({ status: "success", enabled: false });
    expect(updateBillingTest).toHaveBeenCalledWith(BUSINESS_ID, false);
    expect(recordAuditLog).toHaveBeenCalledTimes(1);

    updateBillingTest.mockClear();
    recordAuditLog.mockClear();
    getRegistrationById.mockResolvedValue(plusBusiness(false));
    expect(await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: false })).toEqual({ status: "success", enabled: false });
    expect(updateBillingTest).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });

  it("a failing write reports an error instead of success", async () => {
    getRegistrationById.mockResolvedValue(plusBusiness(false));
    updateBillingTest.mockRejectedValue(new Error("db down"));
    const { changeBusinessBillingTestAction } = await import("./actions");
    const result = await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: true });
    expect(result.status).toBe("server-error");
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
