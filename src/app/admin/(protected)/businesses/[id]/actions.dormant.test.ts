import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// NOTE: no mock of lib/payme/dormant - this is the real, dormant behaviour, even with a complete PayMe configuration present.

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
const KEYS = ["PAYME_ENV", "PAYME_SELLER_ID", "PAYME_HOSTED_FIELDS_KEY", "PAYME_WEBHOOK_SECRET", "PAYMENTS_PROVIDER"] as const;

beforeEach(() => {
  for (const mock of [isAdmin, getRegistrationById, updateBillingTest, recordAuditLog]) mock.mockReset();
  isAdmin.mockResolvedValue(true);
  getRegistrationById.mockResolvedValue({ id: BUSINESS_ID, business_name: "עסק בדיקה", plan_tier: "plus", billing_test_enabled: false });
  process.env.PAYME_ENV = "sandbox";
  process.env.PAYME_SELLER_ID = "MPL-TEST-SELLER-789";
  process.env.PAYME_HOSTED_FIELDS_KEY = "public-key-for-browser-456";
  process.env.PAYME_WEBHOOK_SECRET = "w".repeat(40);
});

describe("the admin's PayMe billing-test switch while PayMe is dormant", () => {
  it("does nothing: no registration is read, no flag is written, no audit entry - even for an admin, even with a full PayMe configuration", async () => {
    const { changeBusinessBillingTestAction } = await import("./actions");
    const result = await changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: true });
    expect(result).toEqual({ status: "validation-error", message: "בדיקת הסליקה אינה זמינה: הסליקה עוברת ל-SUMIT." });
    expect(getRegistrationById).not.toHaveBeenCalled();
    expect(updateBillingTest).not.toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
    for (const key of KEYS) delete process.env[key];
  });

  it("still requires an admin session first", async () => {
    isAdmin.mockResolvedValue(false);
    const { changeBusinessBillingTestAction } = await import("./actions");
    await expect(changeBusinessBillingTestAction({ businessId: BUSINESS_ID, enabled: true })).rejects.toThrow();
    for (const key of KEYS) delete process.env[key];
  });
});
