import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const state = vi.hoisted(() => ({ viewer: null as { id: string } | null, real: false }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/adapters/mock-auth-adapter", () => ({
  authAdapter: { getCurrentUser: async () => state.viewer },
  isRealBusinessOwnerSession: async () => state.real,
}));
vi.mock("@/editor/connected/ConnectedHeader", () => ({ ConnectedHeader: () => null }));
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/demo/ViewerSwitcher/ViewerSwitcher", () => ({ ViewerSwitcher: () => createElement("div", null, "DEMO-SWITCHER") }));
vi.mock("@/components/business-dashboard/DashboardNav/DashboardNav", () => ({ DashboardNav: () => null }));
vi.mock("@/components/business-dashboard/LogoutButton/LogoutButton", () => ({ LogoutButton: () => null }));

import BusinessDashboardLayout from "./layout";

async function render(): Promise<string> {
  return renderToStaticMarkup(await BusinessDashboardLayout({ children: createElement("p", null, "DASHBOARD-BODY") }));
}

describe("business dashboard layout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    state.viewer = null;
    state.real = false;
  });

  it("sends a production guest to the owner login", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(render()).rejects.toThrow("NEXT_REDIRECT:/business/owner/login?next=%2Fbusiness%2Fdashboard");
  });

  it("renders for a real owner in production, without the demo switcher", async () => {
    vi.stubEnv("NODE_ENV", "production");
    state.viewer = { id: "real-owner" };
    state.real = true;
    const html = await render();
    expect(html).toContain("DASHBOARD-BODY");
    expect(html).not.toContain("DEMO-SWITCHER");
  });

  it("hides the demo switcher in production even for a viewer without a real session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    state.viewer = { id: "someone" };
    expect(await render()).not.toContain("DEMO-SWITCHER");
  });

  it("keeps the demo switcher and the guest view in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const html = await render();
    expect(html).toContain("DEMO-SWITCHER");
    expect(html).toContain("DASHBOARD-BODY");
  });
});
