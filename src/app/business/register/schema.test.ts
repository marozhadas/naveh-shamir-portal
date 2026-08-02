import { describe, expect, it } from "vitest";
import { businessRegistrationSchema, EMPTY_FORM_VALUES, firstInvalidField, type BusinessRegistrationFormValues } from "./schema";

function validValues(overrides: Partial<BusinessRegistrationFormValues> = {}): BusinessRegistrationFormValues {
  return {
    ...EMPTY_FORM_VALUES,
    businessName: "מספרת קו הבית",
    categoryId: "beauty",
    description: "מספרה שכונתית לכל המשפחה",
    contactName: "נועה כהן",
    phone: "0501234567",
    ...overrides,
  };
}

describe("businessRegistrationSchema", () => {
  it("accepts a fully valid submission", () => {
    const result = businessRegistrationSchema.safeParse(validValues());
    expect(result.success).toBe(true);
  });

  it("requires a business name", () => {
    const result = businessRegistrationSchema.safeParse(validValues({ businessName: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.businessName?.[0]).toBe("יש להזין שם עסק");
    }
  });

  it("rejects a category not in the known list", () => {
    const result = businessRegistrationSchema.safeParse(validValues({ categoryId: "not-a-real-category" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.categoryId?.[0]).toBe("יש לבחור קטגוריה מהרשימה");
    }
  });

  it("requires a description", () => {
    const result = businessRegistrationSchema.safeParse(validValues({ description: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.description?.[0]).toBe("יש להוסיף תיאור לעסק");
    }
  });

  it("rejects a malformed phone number but allows an empty one when another contact method exists", () => {
    const badPhone = businessRegistrationSchema.safeParse(validValues({ phone: "abc" }));
    expect(badPhone.success).toBe(false);

    const emptyPhoneWithEmail = businessRegistrationSchema.safeParse(validValues({ phone: "", email: "noa@example.com" }));
    expect(emptyPhoneWithEmail.success).toBe(true);
  });

  it("rejects a malformed email address", () => {
    const result = businessRegistrationSchema.safeParse(validValues({ email: "not-an-email" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toBe("כתובת המייל אינה תקינה");
    }
  });

  it("rejects an unsafe website URL", () => {
    const result = businessRegistrationSchema.safeParse(validValues({ websiteUrl: "javascript:alert(1)" }));
    expect(result.success).toBe(false);
  });

  it("requires at least one contact method, flagging all three contact fields", () => {
    const result = businessRegistrationSchema.safeParse(validValues({ phone: "", whatsappPhone: "", email: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.phone?.length).toBeGreaterThan(0);
      expect(fieldErrors.whatsappPhone?.length).toBeGreaterThan(0);
      expect(fieldErrors.email?.length).toBeGreaterThan(0);
    }
  });

  it("does not flag address/serviceArea as required", () => {
    const result = businessRegistrationSchema.safeParse(validValues({ address: "", serviceArea: "" }));
    expect(result.success).toBe(true);
  });
});

describe("firstInvalidField", () => {
  it("returns null when there are no errors", () => {
    expect(firstInvalidField(undefined)).toBeNull();
    expect(firstInvalidField({})).toBeNull();
  });

  it("returns the earliest field in DOM order, not insertion order", () => {
    // "description" comes later in FIELD_ORDER than "businessName" despite being listed first here.
    expect(firstInvalidField({ description: ["x"], businessName: ["y"] })).toBe("businessName");
  });

  it("skips fields with an empty error array", () => {
    expect(firstInvalidField({ businessName: [], email: ["כתובת המייל אינה תקינה"] })).toBe("email");
  });
});
