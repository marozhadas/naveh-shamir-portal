import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { LiveReadinessNotice } from "./LiveReadinessNotice";

const TOKEN = "BUYER154-0987247Y-MLJ10OI7-LXRDNDYP";

function render(report: Parameters<typeof LiveReadinessNotice>[0]["report"], paymeEnv: "sandbox" | "live" | null = "sandbox") {
  return renderToStaticMarkup(createElement(LiveReadinessNotice, { report, paymeEnv }));
}

describe("LiveReadinessNotice (admin)", () => {
  const blocked = {
    checked: true,
    ready: false,
    issueCount: 2,
    issues: [
      { id: "11111111-1111-1111-1111-111111111111", businessName: "סטודיו נועה", planTier: "plus" as const },
      { id: "22222222-2222-2222-2222-222222222222", businessName: "מטבח רוני", planTier: "premium" as const },
    ],
  };

  it("with blocking businesses: a clear warning, the count, and a link per business", () => {
    const html = render(blocked);
    expect(html).toContain('role="alert"');
    expect(html).toContain("לא להעביר ל-Live עדיין");
    expect(html).toContain("2 עסקים בתשלום ממתינים בלי אמצעי תשלום שמור");
    expect(html).toContain('href="/admin/businesses/11111111-1111-1111-1111-111111111111"');
    expect(html).toContain("סטודיו נועה");
    expect(html).toContain("מטבח רוני");
  });

  it("singular wording for one business", () => {
    expect(render({ ...blocked, issueCount: 1, issues: [blocked.issues[0]] })).toContain("1 עסק בתשלום ממתין בלי אמצעי תשלום שמור");
  });

  it("when PayMe is already live the same businesses are reported as blocked from approval now", () => {
    const html = render(blocked, "live");
    expect(html).toContain("אזהרה:");
    expect(html).toContain("הסליקה כבר Live");
  });

  it("with none: states that the system is ready for Live as far as old registrations without a card go", () => {
    const html = render({ checked: true, ready: true, issueCount: 0, issues: [] });
    expect(html).toContain("אין הרשמות ישנות בתשלום");
    expect(html).toContain("המערכת מוכנה למעבר ל-Live");
    expect(html).not.toContain('role="alert"');
  });

  it("a failed check is shown as such, never as ready", () => {
    const html = render({ checked: false, ready: false, issueCount: 0, issues: [] });
    expect(html).toContain("לא ניתן היה לבדוק");
    expect(html).not.toContain("מוכנה למעבר");
  });

  it("never shows a token or card detail, whatever extra data a caller hands in", () => {
    const html = render({ ...blocked, issues: blocked.issues.map((issue) => ({ ...issue, provider_token: TOKEN, card_mask: "411111******1111" })) } as never);
    expect(html).not.toContain(TOKEN);
    expect(html).not.toContain("411111");
  });
});
