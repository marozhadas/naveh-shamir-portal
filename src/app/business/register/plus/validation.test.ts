import { describe, expect, it } from "vitest";
import {
  validateStepOne,
  validateStepTwo,
  validateStepThree,
  validateStepFour,
  validateStepFive,
  getFirstInvalidStep,
  stepForErrorKey,
  stepHasError,
  errorKeyToElementId,
  type StepOneInput,
  type StepTwoInput,
  type StepFourInput,
  type StepFiveInput,
} from "./validation";
import { WEEKDAYS } from "./schema";
import type { HoursState } from "./validation";

function validStepOne(overrides: Partial<StepOneInput> = {}): StepOneInput {
  return {
    businessName: "המאפייה של רוני",
    categoryIds: ["food"],
    businessType: "store",
    contactName: "רוני כהן",
    contactPhone: "+972500000000",
    contactEmail: "roni@example.com",
    addressType: "physical",
    address: "רחוב הדקל 1",
    serviceArea: "",
    ...overrides,
  };
}

function validStepTwo(overrides: Partial<StepTwoInput> = {}): StepTwoInput {
  return {
    coverImage: { url: "https://example.com/cover.jpg", alt: "תמונה" },
    shortDescription: "מאפייה שכונתית",
    fullDescription: "a".repeat(100),
    ...overrides,
  };
}

function closedHours(): HoursState {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day] = { closed: true, intervals: [] };
    return acc;
  }, {} as HoursState);
}

function validStepFour(overrides: Partial<StepFourInput> = {}): StepFourInput {
  return {
    publicPhone: "+972500000000",
    publicWhatsapp: "",
    publicEmail: "",
    websiteUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    openingHours: closedHours(),
    ...overrides,
  };
}

function validStepFive(overrides: Partial<StepFiveInput> = {}): StepFiveInput {
  return {
    publicationConsent: true,
    termsAccepted: true,
    trialConsent: true,
    dashboardAccessConsent: true,
    ...overrides,
  };
}

describe("validateStepOne", () => {
  it("passes with valid input", () => {
    expect(validateStepOne(validStepOne())).toEqual({});
  });

  it("blocks when business name is missing", () => {
    const errors = validateStepOne(validStepOne({ businessName: "" }));
    expect(errors.businessName).toBe("יש להזין שם עסק");
  });

  it("blocks when category is missing", () => {
    const errors = validateStepOne(validStepOne({ categoryIds: [] }));
    expect(errors.categoryIds).toBe("יש לבחור לפחות קטגוריה אחת");
  });

  it("blocks when phone is invalid", () => {
    const errors = validateStepOne(validStepOne({ contactPhone: "abc" }));
    expect(errors.contactPhone).toBe("מספר הטלפון אינו תקין");
  });

  it("blocks when email is invalid", () => {
    const errors = validateStepOne(validStepOne({ contactEmail: "not-an-email" }));
    expect(errors.contactEmail).toBe("כתובת המייל אינה תקינה");
  });

  it("requires address when addressType is physical", () => {
    const errors = validateStepOne(validStepOne({ addressType: "physical", address: "" }));
    expect(errors.address).toBe("יש להזין כתובת");
  });

  it("requires service area when addressType is service-area", () => {
    const errors = validateStepOne(validStepOne({ addressType: "service-area", address: "", serviceArea: "" }));
    expect(errors.serviceArea).toBe("יש להזין אזור שירות");
    expect(errors.address).toBeUndefined();
  });
});

describe("validateStepTwo", () => {
  it("passes with valid input", () => {
    expect(validateStepTwo(validStepTwo())).toEqual({});
  });

  it("blocks when there is no main image", () => {
    const errors = validateStepTwo(validStepTwo({ coverImage: null }));
    expect(errors.coverImage).toBe("יש להעלות תמונה ראשית");
  });

  it("blocks when the short description is missing", () => {
    const errors = validateStepTwo(validStepTwo({ shortDescription: "" }));
    expect(errors.shortDescription).toBeTruthy();
  });

  it("blocks when the full description is too short", () => {
    const errors = validateStepTwo(validStepTwo({ fullDescription: "קצר מדי" }));
    expect(errors.fullDescription).toBe("התיאור המלא קצר מדי — לפחות 100 תווים");
  });
});

describe("validateStepThree", () => {
  it("passes when every service has a title", () => {
    expect(validateStepThree([{ title: "תספורת", description: "", priceLabel: "" }])).toEqual({});
  });

  it("blocks when there are no services at all", () => {
    const errors = validateStepThree([]);
    expect(errors.services).toBe("יש להוסיף לפחות שירות אחד");
  });

  it("blocks a specific service missing a title, by its index", () => {
    const errors = validateStepThree([
      { title: "תספורת", description: "", priceLabel: "" },
      { title: "", description: "", priceLabel: "" },
    ]);
    expect(errors["service-title-1"]).toBe("יש להזין שם שירות");
    expect(errors["service-title-0"]).toBeUndefined();
  });

  // Regression: z.array(serviceSchema) validates every item, and Zod's flatten() groups ALL issues
  // (including nested per-item ones like services.0.title) under the array's own top-level key. That
  // used to leak a spurious `errors.services` alongside the correct `errors["service-title-0"]" — and
  // since "services" has no matching DOM element, it used to win STEP_KEYS' first-invalid-field lookup
  // ahead of the real field and silently break focus (see PlusRegistrationWizard.tsx's firstInvalidFieldId).
  it("does not set a spurious top-level 'services' error when only a specific item is invalid", () => {
    const errors = validateStepThree([
      { title: "", description: "", priceLabel: "" },
      { title: "שירות תקין", description: "", priceLabel: "" },
    ]);
    expect(errors["service-title-0"]).toBe("יש להזין שם שירות");
    expect(errors.services).toBeUndefined();
  });

  it("passes with zero testimonials — they're optional, unlike services", () => {
    const errors = validateStepThree([{ title: "תספורת", description: "", priceLabel: "" }], []);
    expect(errors).toEqual({});
  });

  it("passes with a fully valid testimonial", () => {
    const errors = validateStepThree(
      [{ title: "תספורת", description: "", priceLabel: "" }],
      [{ authorName: "דנה לוי", text: "שירות מעולה!", roleOrContext: "לקוחה קבועה" }],
    );
    expect(errors).toEqual({});
  });

  it("blocks a testimonial missing an author name, by its index", () => {
    const errors = validateStepThree(
      [{ title: "תספורת", description: "", priceLabel: "" }],
      [{ authorName: "", text: "שירות מעולה!", roleOrContext: "" }],
    );
    expect(errors["testimonial-author-0"]).toBe("יש להזין שם ממליץ/ה");
  });

  it("blocks a testimonial missing text, by its index", () => {
    const errors = validateStepThree(
      [{ title: "תספורת", description: "", priceLabel: "" }],
      [{ authorName: "דנה לוי", text: "", roleOrContext: "" }],
    );
    expect(errors["testimonial-text-0"]).toBe("יש להזין את תוכן ההמלצה");
  });

  it("does not set a spurious top-level 'testimonials' error when only a specific item is invalid (same flatten() fix as services)", () => {
    const errors = validateStepThree(
      [{ title: "תספורת", description: "", priceLabel: "" }],
      [
        { authorName: "", text: "שירות מעולה!", roleOrContext: "" },
        { authorName: "דנה לוי", text: "שירות מצוין", roleOrContext: "" },
      ],
    );
    expect(errors["testimonial-author-0"]).toBe("יש להזין שם ממליץ/ה");
    expect(errors.testimonials).toBeUndefined();
  });
});

describe("validateStepFour", () => {
  it("passes with valid input", () => {
    expect(validateStepFour(validStepFour())).toEqual({});
  });

  it("blocks when the public phone is invalid", () => {
    const errors = validateStepFour(validStepFour({ publicPhone: "abc" }));
    expect(errors.publicPhone).toBe("מספר הטלפון הציבורי אינו תקין");
  });

  it("blocks a day whose closing time is before its opening time, with the day name in the message", () => {
    const hours = closedHours();
    hours.sunday = { closed: false, intervals: [{ opensAt: "18:00", closesAt: "09:00" }] };
    const errors = validateStepFour(validStepFour({ openingHours: hours }));
    expect(errors.hours_sunday).toContain("ראשון");
    expect(errors.hours_sunday).toContain("שעת הסגירה חייבת להיות אחרי שעת הפתיחה");
  });

  it("blocks an open day with no interval at all", () => {
    const hours = closedHours();
    hours.monday = { closed: false, intervals: [] };
    const errors = validateStepFour(validStepFour({ openingHours: hours }));
    expect(errors.hours_monday).toContain("שני");
  });

  it("blocks two overlapping intervals on the same day", () => {
    const hours = closedHours();
    hours.thursday = {
      closed: false,
      intervals: [
        { opensAt: "09:00", closesAt: "14:00" },
        { opensAt: "13:00", closesAt: "18:00" },
      ],
    };
    const errors = validateStepFour(validStepFour({ openingHours: hours }));
    expect(errors.hours_thursday).toContain("חמישי");
    expect(errors.hours_thursday).toContain("חופפים");
  });

  it("does not flag a closed day even with no intervals", () => {
    const hours = closedHours();
    hours.saturday = { closed: true, intervals: [] };
    const errors = validateStepFour(validStepFour({ openingHours: hours }));
    expect(errors.hours_saturday).toBeUndefined();
  });
});

describe("validateStepFive", () => {
  it("passes for plus with all consents accepted", () => {
    expect(validateStepFive(validStepFive(), "plus")).toEqual({});
  });

  it("blocks plus when trial consent is missing", () => {
    const errors = validateStepFive(validStepFive({ trialConsent: false }), "plus");
    expect(errors.trialConsent).toBe("יש לאשר את הפעלת חודש הניסיון");
  });

  it("blocks premium when dashboard access consent is missing", () => {
    const errors = validateStepFive(validStepFive({ dashboardAccessConsent: false }), "premium");
    expect(errors.dashboardAccessConsent).toBe("יש לאשר קבלת גישה מאובטחת לאזור האישי במייל");
  });

  it("blocks when terms are not accepted, regardless of plan", () => {
    const errors = validateStepFive(validStepFive({ termsAccepted: false }), "plus");
    expect(errors.termsAccepted).toBe("יש לאשר את תנאי השימוש");
  });
});

describe("stepForErrorKey / getFirstInvalidStep / stepHasError", () => {
  it("maps simple fields to their step", () => {
    expect(stepForErrorKey("businessName")).toBe(1);
    expect(stepForErrorKey("shortDescription")).toBe(2);
    expect(stepForErrorKey("services")).toBe(3);
    expect(stepForErrorKey("publicPhone")).toBe(4);
    expect(stepForErrorKey("termsAccepted")).toBe(5);
  });

  it("maps service-*, testimonial-*, and hours_* keys to steps 3 and 4", () => {
    expect(stepForErrorKey("service-title-2")).toBe(3);
    expect(stepForErrorKey("testimonial-author-0")).toBe(3);
    expect(stepForErrorKey("testimonials")).toBe(3);
    expect(stepForErrorKey("hours_sunday")).toBe(4);
  });

  it("returns the earliest step among mixed errors", () => {
    expect(getFirstInvalidStep({ termsAccepted: "x", businessName: "y", "hours_sunday": "z" })).toBe(1);
  });

  it("returns null when there are no errors", () => {
    expect(getFirstInvalidStep({})).toBeNull();
  });

  it("detects whether a given step has an error", () => {
    const errors = { "service-title-0": "יש להזין שם שירות" };
    expect(stepHasError(errors, 3)).toBe(true);
    expect(stepHasError(errors, 1)).toBe(false);
  });
});

describe("errorKeyToElementId", () => {
  it("passes simple field keys through unchanged", () => {
    expect(errorKeyToElementId("businessName")).toBe("businessName");
  });

  it("converts hours_<day> to hours-<day>", () => {
    expect(errorKeyToElementId("hours_sunday")).toBe("hours-sunday");
  });

  it("maps categoryIds to the category group's label id", () => {
    expect(errorKeyToElementId("categoryIds")).toBe("category-label");
  });
});
