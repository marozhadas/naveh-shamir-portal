import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { REJECT_APPROVED_BUSINESS_EXPLANATION } from "@/lib/admin/describe-saved-payment-method";

const read = (name: string) => readFileSync(path.join(__dirname, name), "utf8");

describe("the reject button of an approved business (UI wiring; the rules stay in the server action)", () => {
  const page = read("page.tsx");
  const panel = read("ApproveRejectPanel.tsx");
  const hideSection = page.slice(page.indexOf('aria-labelledby="hide-business-heading"'), page.indexOf('registration.status === "pending" && ('));

  it("the dialog text says it hides the business, ends the LOCAL trial, makes no charge and no provider call, keeps the SUMIT card, and that a billed / unsupported subscription blocks it", () => {
    expect(REJECT_APPROVED_BUSINESS_EXPLANATION).toContain("תסתיר את העסק");
    expect(REJECT_APPROVED_BUSINESS_EXPLANATION).toContain("מנוי הניסיון המקומי");
    expect(REJECT_APPROVED_BUSINESS_EXPLANATION).toContain("ללא חיוב");
    expect(REJECT_APPROVED_BUSINESS_EXPLANATION).toContain("בלי קריאה לספק הסליקה");
    expect(REJECT_APPROVED_BUSINESS_EXPLANATION).toContain("לא יימחק");
    expect(REJECT_APPROVED_BUSINESS_EXPLANATION).toContain("תיחסם");
  });

  it("an approved business gets its own 'hide' section with ONLY the reject button - the panel is told mode=approved", () => {
    expect(page).toMatch(/registration\.status === "approved" && \(\s*<section/);
    expect(hideSection).toContain('mode="approved"');
    expect(hideSection).toContain("REJECT_APPROVED_BUSINESS_EXPLANATION");
    expect(panel).toMatch(/\{!approvedMode && \(\s*<Button\s+variant="accent"/); // the approve button is not rendered
    expect(panel).toMatch(/\{!approvedMode && \(\s*<dialog ref=\{approveDialogRef\}/); // nor its dialog
    expect(panel).toContain("{approvedMode && <p className={styles.dialogText}>{REJECT_APPROVED_BUSINESS_EXPLANATION}</p>}");
  });

  it("it is separate from the delete button: delete stays in the page header actions, the hide section has no delete control", () => {
    expect(hideSection).not.toMatch(/DeleteBusinessButton|delete/i);
    const headerActions = page.slice(page.indexOf("<div className={styles.actions}>"), page.indexOf('registration.status === "rejected"'));
    expect(headerActions).toContain("DeleteBusinessButton");
    expect(headerActions).not.toContain("ApproveRejectPanel");
  });

  it("the pending page is unchanged: approve and reject together, in the default mode", () => {
    const pending = page.slice(page.indexOf('registration.status === "pending" && ('));
    expect(pending).toContain("<ApproveRejectPanel");
    expect(pending).not.toContain('mode="approved"');
  });

  it("the panel calls the same server action; it decides nothing itself (no status or billing logic in the client)", () => {
    expect(panel).toContain("rejectRegistrationAction.bind(null, registrationId)");
    const code = panel.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/payment_provider|sumit|billing_transactions|business_subscriptions/i);
  });
});
