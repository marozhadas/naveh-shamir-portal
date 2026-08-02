import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { MockEmailProvider } = await import("./mock-email-provider");

describe("MockEmailProvider", () => {
  it("never throws and reports status 'skipped' instead of pretending to have sent an email", async () => {
    const provider = new MockEmailProvider();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await provider.sendAdminNotificationEmail({
      toEmail: "admin@example.com",
      businessName: "עסק לדוגמה",
      categoryLabel: "אוכל וקולינריה",
      contactName: "דנה",
      createdAt: new Date().toISOString(),
      adminUrl: "https://example.com/admin/businesses/1",
    });

    expect(result.status).toBe("skipped");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("מצב הדגמה"));
    logSpy.mockRestore();
  });
});
