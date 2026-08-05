import { describe, expect, it } from "vitest";
import { contactFormSchema, EMPTY_CONTACT_FORM_VALUES, firstInvalidField } from "./schema";
import type { ContactFormValues } from "./schema";

function makeValues(overrides: Partial<ContactFormValues> = {}): ContactFormValues {
  return {
    ...EMPTY_CONTACT_FORM_VALUES,
    fullName: "ישראל ישראלי",
    email: "israel@example.com",
    subjectType: "general",
    subject: "שאלה על הפורטל",
    message: "זו הודעה מפורטת מספיק שעוברת את אורך המינימום הנדרש בטופס.",
    consentAccepted: true,
    ...overrides,
  };
}

function issuesFor(values: ContactFormValues, path: string): string[] {
  const result = contactFormSchema.safeParse(values);
  if (result.success) return [];
  return result.error.issues.filter((i) => i.path.join(".") === path).map((i) => i.message);
}

describe("contactFormSchema", () => {
  it("accepts a minimal valid submission", () => {
    expect(contactFormSchema.safeParse(makeValues()).success).toBe(true);
  });

  it("rejects an empty full name", () => {
    expect(issuesFor(makeValues({ fullName: "" }), "fullName").length).toBeGreaterThan(0);
  });

  it("rejects an empty email", () => {
    expect(issuesFor(makeValues({ email: "" }), "email").length).toBeGreaterThan(0);
  });

  it("rejects an invalid email", () => {
    expect(issuesFor(makeValues({ email: "not-an-email" }), "email").length).toBeGreaterThan(0);
  });

  it("accepts a submission with no WhatsApp number (optional)", () => {
    expect(contactFormSchema.safeParse(makeValues({ whatsapp: "" })).success).toBe(true);
  });

  it("accepts a valid WhatsApp number", () => {
    expect(contactFormSchema.safeParse(makeValues({ whatsapp: "054-521-8644" })).success).toBe(true);
  });

  it("rejects an invalid WhatsApp number", () => {
    expect(issuesFor(makeValues({ whatsapp: "abc" }), "whatsapp").length).toBeGreaterThan(0);
  });

  it("requires a subject type", () => {
    expect(issuesFor(makeValues({ subjectType: "" }), "subjectType").length).toBeGreaterThan(0);
  });

  it("rejects an unknown subject type", () => {
    expect(issuesFor(makeValues({ subjectType: "not-a-real-type" }), "subjectType").length).toBeGreaterThan(0);
  });

  it("requires a subject title", () => {
    expect(issuesFor(makeValues({ subject: "" }), "subject").length).toBeGreaterThan(0);
  });

  it("rejects a message shorter than the minimum length", () => {
    expect(issuesFor(makeValues({ message: "קצר מדי" }), "message").length).toBeGreaterThan(0);
  });

  it("accepts a message at exactly the minimum length", () => {
    expect(contactFormSchema.safeParse(makeValues({ message: "a".repeat(20) })).success).toBe(true);
  });

  it("requires consent to be accepted", () => {
    expect(issuesFor(makeValues({ consentAccepted: false }), "consentAccepted").length).toBeGreaterThan(0);
  });
});

describe("firstInvalidField", () => {
  it("returns null when there are no field errors", () => {
    expect(firstInvalidField(undefined)).toBeNull();
    expect(firstInvalidField({})).toBeNull();
  });

  it("returns the first field (in DOM order) that has an error", () => {
    expect(firstInvalidField({ subject: ["חסר"], email: ["לא תקין"] })).toBe("email");
  });
});
