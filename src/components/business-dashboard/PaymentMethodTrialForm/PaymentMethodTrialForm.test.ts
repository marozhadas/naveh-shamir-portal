import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.resolve(__dirname, "PaymentMethodTrialForm.tsx"), "utf8");

describe("PaymentMethodTrialForm - Hosted Fields wiring", () => {
  it("asks PayMe for a permanent token (tokenIsPermanent: true), which PayMe confirmed is the buyer_key", () => {
    expect(source).toMatch(/tokenIsPermanent:\s*true/);
  });

  it("tokenizes with total = the server-provided subscription price, and does not charge", () => {
    expect(source).toMatch(/total:\s*\{[\s\S]*?amount:\s*\{\s*currency:\s*"ILS",\s*value:\s*amountValue\s*\}/);
    expect(source).not.toMatch(/generate-sale|capture|charge\(/i);
  });

  it("sends only the token, the masked card and the consent to the server", () => {
    expect(source).toMatch(/activateTrialWithPaymentMethodAction\(\{\s*token:\s*result\.token,\s*cardMask:[^,]+,\s*consent\s*\}\)/);
  });

  it("never reads or stores card number, CVV or expiry in component state", () => {
    expect(source).not.toMatch(/useState\([^)]*(cardNumber|cvv|cvc|expiry)/i);
  });
});
