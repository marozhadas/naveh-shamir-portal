import { describe, expect, it, vi } from "vitest";

// actions.ts transitively imports several "server-only"-guarded modules (admin-client,
// notifications, the email provider) for the post-success notification path. That package throws
// outside a real Next.js server-component bundle, so it's stubbed for this Node-environment test —
// the validation-error branch under test here never reaches that code anyway.
vi.mock("server-only", () => ({}));

const { registerBusinessAction } = await import("./actions");
const { EMPTY_FORM_VALUES } = await import("./schema");
const INITIAL_STATE = { status: "idle" as const, values: EMPTY_FORM_VALUES };

/**
 * These only cover the validation-error branch, which returns before ever touching Supabase —
 * that's exactly the branch this fix is about (never lose what the visitor already typed). The
 * success/server-error branches need a real Supabase connection and are covered by live
 * browser verification instead (see the session's manual test notes), matching how the rest of
 * this codebase tests Supabase-backed code.
 */
function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const VALID_FIELDS = {
  businessName: "מספרת קו הבית",
  categoryId: "beauty",
  shortDescription: "",
  description: "מספרה שכונתית לכל המשפחה",
  contactName: "נועה כהן",
  phone: "0501234567",
  whatsappPhone: "",
  email: "",
  websiteUrl: "",
  address: "",
  serviceArea: "",
};

describe("registerBusinessAction — validation-error branch", () => {
  it("keeps every submitted value when one field is invalid", async () => {
    const formData = buildFormData({ ...VALID_FIELDS, businessName: "" });
    const result = await registerBusinessAction(INITIAL_STATE, formData);

    expect(result.status).toBe("validation-error");
    expect(result.values).toEqual({ ...VALID_FIELDS, businessName: "" });
  });

  it("only flags the actually-invalid field, not the valid ones", async () => {
    const formData = buildFormData({ ...VALID_FIELDS, email: "not-an-email" });
    const result = await registerBusinessAction(INITIAL_STATE, formData);

    expect(result.status).toBe("validation-error");
    expect(result.fieldErrors?.email?.[0]).toBe("כתובת המייל אינה תקינה");
    expect(result.fieldErrors?.businessName).toBeUndefined();
    expect(result.fieldErrors?.contactName).toBeUndefined();
  });

  it("returns a Hebrew, non-technical message alongside the field errors", async () => {
    const formData = buildFormData({ ...VALID_FIELDS, description: "" });
    const result = await registerBusinessAction(INITIAL_STATE, formData);

    expect(result.message).toBe("יש כמה פרטים שצריך לתקן");
    expect(result.message).not.toMatch(/sql|postgres|rls|zod/i);
  });

  it("trims values the same way regardless of validity", async () => {
    const formData = buildFormData({ ...VALID_FIELDS, businessName: "  מספרה  ", contactName: "" });
    const result = await registerBusinessAction(INITIAL_STATE, formData);

    expect(result.status).toBe("validation-error");
    expect(result.values.businessName).toBe("מספרה");
  });
});
