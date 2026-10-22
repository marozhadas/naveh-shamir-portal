import { describe, expect, it } from "vitest";
import { describeApprovalActivation, describeSavedPaymentMethod } from "./describe-saved-payment-method";

const sumit = { hasPaymentMethod: true, cardMask: "XXXXXXXXXXXX0772", provider: "sumit" } as const;

describe("what the admin reads about a saved card", () => {
  it("SUMIT, pending: where the card is, its last four, no charge, what approving does (trial days from the offer), and that billing is not connected", () => {
    const text = describeSavedPaymentMethod(sumit, "pending", "launch_standard");
    expect(text).toContain("SUMIT");
    expect(text).toContain("כרטיס שמסתיים ב-0772");
    expect(text).toContain("לא בוצע חיוב");
    expect(text).toContain("30 ימים");
    expect(text).toContain("החיוב האוטומטי עדיין לא מחובר");
    expect(text).not.toMatch(/PayMe|XXXX/);
  });

  it("SUMIT with the pilot offer says 90 days", () => {
    expect(describeSavedPaymentMethod(sumit, "pending", "pilot_2026")).toContain("90 ימים");
  });

  it("SUMIT, approved: a card kept at SUMIT, no charge, billing not connected - and it never promises a charge", () => {
    const text = describeSavedPaymentMethod(sumit, "approved", "launch_standard");
    expect(text).toContain("כרטיס שמסתיים ב-0772");
    expect(text).toContain("לא בוצע חיוב");
    expect(text).not.toMatch(/ישמש|יחויב|יתבצע חיוב/);
  });

  it("a SUMIT card without a readable mask is still described, without inventing digits", () => {
    expect(describeSavedPaymentMethod({ ...sumit, cardMask: null }, "pending", "launch_standard")).toContain("(כרטיס)");
  });

  it("no card, and the PayMe card, keep their earlier texts", () => {
    expect(describeSavedPaymentMethod({ hasPaymentMethod: false, cardMask: null, provider: null }, "pending", "launch_standard")).toBe("לא נשמר אמצעי תשלום לעסק הזה.");
    expect(describeSavedPaymentMethod({ hasPaymentMethod: true, cardMask: "411111******1111", provider: "payme" }, "pending", "launch_standard")).toBe("נשמר אמצעי תשלום (411111******1111). לא בוצע חיוב. הוא ישמש ליצירת המנוי ברגע שתאשרו את העסק.");
  });
});

describe("the approval dialog", () => {
  const base = { hasPaymentMethod: true, cardMask: "XXXXXXXXXXXX0772", offerLabel: "רגיל", trialDays: 30 };

  it("SUMIT: a trial without any charge, no PayMe subscription, no 'first charge at the end'", () => {
    const text = describeApprovalActivation({ ...base, provider: "sumit" });
    expect(text).toContain("ללא חיוב");
    expect(text).toContain("30 ימים");
    expect(text).toContain("כרטיס שמסתיים ב-0772");
    expect(text).toContain("לא יתבצע חיוב גם בסיום הניסיון");
    expect(text).not.toMatch(/PayMe|החיוב הראשון יתבצע/);
  });

  it("PayMe keeps its earlier text; no card keeps its earlier text", () => {
    expect(describeApprovalActivation({ ...base, cardMask: "411111******1111", provider: "payme" })).toContain("ייווצר מנוי ב-PayMe");
    expect(describeApprovalActivation({ ...base, cardMask: "411111******1111" })).toContain("ייווצר מנוי ב-PayMe"); // provider not given = the earlier behaviour
    expect(describeApprovalActivation({ ...base, hasPaymentMethod: false, cardMask: null, provider: null })).toContain("אין אמצעי תשלום שמור");
  });
});
