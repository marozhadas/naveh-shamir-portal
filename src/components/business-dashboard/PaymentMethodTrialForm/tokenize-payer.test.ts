import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CARD_ERROR_MESSAGE,
  COMMUNICATION_ERROR_MESSAGE,
  PAYER_ERROR,
  UNKNOWN_PAYMENT_ERROR_MESSAGE,
  isValidIsraeliPhone,
  mapPaymeFailureToHebrew,
  normalizePhone,
  tokenizeWithPayer,
  validatePayer,
  type PayerInput,
} from "./tokenize-payer";

const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";
const TOTAL = { label: "Plus — נווה שמיר", amount: { currency: "ILS", value: "39.00" } };
const payer = (overrides: Partial<PayerInput> = {}): PayerInput => ({ firstName: "הדס", lastName: "מרוז", email: "hadas@example.com", phone: "054-521-8644", ...overrides });
const success = () => vi.fn(async () => ({ type: "tokenize-success", token: TOKEN, card: { cardMask: "411111******1111" } }));

describe("payer validation (before PayMe is called)", () => {
  it("a valid payer has no errors", () => {
    expect(validatePayer(payer())).toEqual({});
  });

  it("missing first name", () => {
    expect(validatePayer(payer({ firstName: "   " }))).toEqual({ firstName: "יש למלא שם פרטי ושם משפחה" });
  });

  it("missing last name", () => {
    expect(validatePayer(payer({ lastName: "" }))).toEqual({ lastName: "יש למלא שם פרטי ושם משפחה" });
  });

  it("missing email", () => {
    expect(validatePayer(payer({ email: "" }))).toEqual({ email: "יש להזין כתובת אימייל תקינה" });
  });

  it("invalid email", () => {
    for (const email of ["hadas", "hadas@", "hadas@example", "had as@example.com", "@example.com"]) {
      expect(validatePayer(payer({ email })), email).toEqual({ email: PAYER_ERROR.email });
    }
  });

  it("missing or invalid phone", () => {
    for (const phone of ["", "abc", "12345", "054-521", "0545218644123456"]) {
      expect(validatePayer(payer({ phone })), phone).toEqual({ phone: PAYER_ERROR.phone });
    }
  });

  it("reports every missing field at once", () => {
    expect(Object.keys(validatePayer({ firstName: "", lastName: "", email: "", phone: "" })).sort()).toEqual(["email", "firstName", "lastName", "phone"]);
  });
});

describe("phone normalization (only for the value sent to the SDK)", () => {
  it("hyphens are removed: 054-521-8644 -> 0545218644", () => {
    expect(normalizePhone("054-521-8644")).toBe("0545218644");
  });

  it("spaces are removed: 054 521 8644 -> 0545218644", () => {
    expect(normalizePhone("054 521 8644")).toBe("0545218644");
    expect(normalizePhone(" 054  521   8644 ")).toBe("0545218644");
  });

  it("parentheses and dots are removed", () => {
    expect(normalizePhone("(054) 521-8644")).toBe("0545218644");
    expect(normalizePhone("054.521.8644")).toBe("0545218644");
  });

  it("a number that is already plain digits is not changed", () => {
    expect(normalizePhone("0545218644")).toBe("0545218644");
    expect(normalizePhone("+972545218644")).toBe("+972545218644");
    expect(normalizePhone("972545218644")).toBe("972545218644");
  });

  it("valid Israeli numbers (mobile, landline, +972 forms) pass; others do not", () => {
    for (const ok of ["0545218644", "0501234567", "035551234", "0771234567", "+972545218644", "972545218644"]) expect(isValidIsraeliPhone(ok), ok).toBe(true);
    for (const bad of ["545218644", "0145218644", "05452186", "+1555123456"]) expect(isValidIsraeliPhone(bad), bad).toBe(false);
  });

  it("the SDK gets the normalized phone while nothing else about the payer is altered", async () => {
    const tokenize = success();
    await tokenizeWithPayer(tokenize, payer({ firstName: "  הדס ", phone: "054-521-8644" }), TOTAL);
    expect(tokenize).toHaveBeenCalledWith({ payerFirstName: "הדס", payerLastName: "מרוז", payerEmail: "hadas@example.com", payerPhone: "0545218644", total: TOTAL });
  });

  it("the user's own input is not touched by normalizing (the helper returns a new value; the form state keeps what was typed)", () => {
    const input = payer({ phone: "054-521-8644" });
    void tokenizeWithPayer(success(), input, TOTAL);
    expect(input.phone).toBe("054-521-8644");
  });
});

describe("tokenizeWithPayer", () => {
  it("invalid payer: PayMe is never called, the field errors are returned", async () => {
    const tokenize = success();
    const outcome = await tokenizeWithPayer(tokenize, payer({ email: "nope" }), TOTAL);
    expect(outcome).toEqual({ status: "invalid", fieldErrors: { email: PAYER_ERROR.email } });
    expect(tokenize).not.toHaveBeenCalled();
  });

  it("success: returns the token and the card mask", async () => {
    expect(await tokenizeWithPayer(success(), payer(), TOTAL)).toEqual({ status: "ok", token: TOKEN, cardMask: "411111******1111" });
  });

  it("a tokenize() REJECTION is shown in Hebrew, never as PayMe's raw English text", async () => {
    const cases: [string, string][] = [
      ['Please provide "payerEmail" value', PAYER_ERROR.email],
      ["Invalid email address", PAYER_ERROR.email],
      ["Invalid phone number", PAYER_ERROR.phone],
      ['Please provide "payerPhone" value', PAYER_ERROR.phone],
      ['Please provide "payerFirstName" value', PAYER_ERROR.name],
      ['Please provide "payerLastName" value', PAYER_ERROR.name],
      ["Invalid card number", CARD_ERROR_MESSAGE],
      ["Something nobody has seen before", UNKNOWN_PAYMENT_ERROR_MESSAGE],
    ];
    for (const [raw, expected] of cases) {
      const outcome = await tokenizeWithPayer(vi.fn(async () => Promise.reject(new Error(raw))), payer(), TOTAL);
      expect(outcome.status, raw).toBe("failed");
      if (outcome.status === "failed") {
        expect(outcome.message, raw).toBe(expected);
        expect(outcome.message).not.toMatch(/[A-Za-z]{4,}/); // no raw English leaks (card brand codes etc. aside, the messages are Hebrew)
        expect(outcome.message).not.toContain(raw);
      }
    }
  });

  it("an unknown rejection becomes the 'could not verify the payment details' message, not the communication one", async () => {
    const outcome = await tokenizeWithPayer(vi.fn(async () => Promise.reject({ weird: "payload" })), payer(), TOTAL);
    expect(outcome).toMatchObject({ status: "failed", message: "לא הצלחנו לאמת את פרטי התשלום. בדקו את הפרטים ונסו שוב." });
  });

  it("a real network failure of tokenize() is still a communication failure", async () => {
    for (const raw of ["Failed to fetch", "NetworkError when attempting to fetch resource", "timeout of 20000ms exceeded"]) {
      const outcome = await tokenizeWithPayer(vi.fn(async () => Promise.reject(new TypeError(raw))), payer(), TOTAL);
      expect(outcome).toMatchObject({ status: "failed", message: COMMUNICATION_ERROR_MESSAGE });
    }
  });

  it("an error RESULT from PayMe (card problem) is mapped to a safe Hebrew card message, not shown raw", async () => {
    const outcome = await tokenizeWithPayer(vi.fn(async () => ({ type: "tokenize-error", errors: { number: { message: "Card number is invalid" }, cvc: "Bad CVV" } })), payer(), TOTAL);
    expect(outcome).toMatchObject({ status: "failed", message: CARD_ERROR_MESSAGE, restartSession: true });
    const unknown = await tokenizeWithPayer(vi.fn(async () => ({ type: "tokenize-error", message: "Declined by issuer 51" })), payer(), TOTAL);
    expect(unknown).toMatchObject({ status: "failed", message: UNKNOWN_PAYMENT_ERROR_MESSAGE });
  });

  it("a payer-field rejection keeps the card fields (the SDK refused before sending), other failures start a fresh PayMe session", async () => {
    const payerProblem = await tokenizeWithPayer(vi.fn(async () => Promise.reject(new Error("Invalid phone number"))), payer(), TOTAL);
    expect(payerProblem).toMatchObject({ restartSession: false });
    const other = await tokenizeWithPayer(vi.fn(async () => Promise.reject(new Error("Invalid card number"))), payer(), TOTAL);
    expect(other).toMatchObject({ restartSession: true });
  });

  it("the outcome of a failure never carries a token, card data or the raw payload", async () => {
    const outcome = await tokenizeWithPayer(vi.fn(async () => ({ type: "tokenize-error", token: TOKEN, card: { cardMask: "411111******1111" }, errors: { number: "x" } })), payer(), TOTAL);
    expect(JSON.stringify(outcome)).not.toContain(TOKEN);
    expect(JSON.stringify(outcome)).not.toContain("411111");
  });
});

describe("mapPaymeFailureToHebrew", () => {
  it("is Hebrew for everything it returns", () => {
    for (const input of ["Invalid email", "Invalid phone number", "Letters only", "card", "weird", "", null, undefined, 42]) {
      expect(mapPaymeFailureToHebrew(input)).toMatch(/[֐-׿]/);
    }
  });
});

describe("the form: tokenization problems vs a real communication failure", () => {
  const form = readFileSync(path.resolve(__dirname, "PaymentMethodTrialForm.tsx"), "utf8");

  it("the payer fields are required and validated before tokenize()", () => {
    expect(form).toMatch(/tokenizeWithPayer\(instance\.tokenize, payer,/);
    expect(form.match(/aria-required="true"/g)?.length).toBe(4);
    expect(form).toMatch(/inputMode="tel"/);
  });

  it("a real server / network failure (the server action or the network) is still shown as a communication failure", () => {
    expect(form).toMatch(/catch \{[\s\S]*?setError\(COMMUNICATION_ERROR_MESSAGE\)/);
    expect(form).not.toContain('"אירעה תקלה בתקשורת');
  });

  it("the raw PayMe error text is not rendered anywhere in the form", () => {
    expect(form).not.toMatch(/result\.errors|first\?\.message|\.message \?\? "פרטי הכרטיס/);
    expect(form).not.toMatch(/console\./);
  });
});
