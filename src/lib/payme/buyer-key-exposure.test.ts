import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const read = (file: string) => readFileSync(file, "utf8");
const rel = (file: string) => path.relative(SRC, file).replace(/\\/g, "/");

describe("the buyer_key (the saved Hosted Fields token) stays server-side", () => {
  it("is read from the database in exactly one module: the subscription service (plus the row type in types/billing.ts)", () => {
    const readers = files.filter((file) => read(file).includes("provider_token")).map(rel).sort();
    expect(readers).toEqual(["repositories/supabase-subscription-service.ts", "types/billing.ts"]);
  });

  it("is never selected for the admin: the admin helper selects only the card mask", () => {
    const service = read(path.join(SRC, "repositories/supabase-subscription-service.ts"));
    const helper = service.slice(service.indexOf("export async function getSavedPaymentMethodInfo"), service.indexOf("export type CancelForRejectionResult"));
    expect(helper).toContain('.select("card_mask")');
    expect(helper).not.toContain("provider_token");
  });

  it("no browser code or admin page/component mentions the token column, buyer_key or a payment token variable", () => {
    const suspects = files.filter((file) => /^\s*["']use client["']/.test(read(file).slice(0, 200)) || rel(file).startsWith("app/admin/"));
    for (const file of suspects) {
      const source = read(file);
      expect(source, rel(file)).not.toMatch(/provider_token|buyer_key|buyerKey/);
    }
  });

  it("the only thing that goes back to the browser after step 6 is a status: the action never returns the token", () => {
    const source = read(path.join(SRC, "app/business/dashboard/payment-actions.ts"));
    const action = source.slice(source.indexOf("export async function savePaymentMethodForRegistrationAction"), source.indexOf("export type CancelSubscriptionState"));
    for (const returned of action.match(/return \{[^}]*\};?/g) ?? []) expect(returned).not.toMatch(/token/i);
  });

  it("no console call in the subscription service or the payment actions prints a token", () => {
    for (const file of ["repositories/supabase-subscription-service.ts", "app/business/dashboard/payment-actions.ts"]) {
      for (const line of read(path.join(SRC, file)).split("\n").filter((l) => /console\.(log|info|warn|error)/.test(l))) {
        expect(line, `${file}: ${line.trim()}`).not.toMatch(/paymentToken|buyerKey|provider_token|input\.token|\btoken\b/);
      }
    }
  });

  it("no public view or analytics path selects it", () => {
    for (const file of files.filter((f) => /public-columns|analytics|\/api\//.test(rel(f)) || rel(f).startsWith("lib/supabase/public"))) {
      expect(read(file), rel(file)).not.toContain("provider_token");
    }
  });
});
