import { afterEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

import { redirectGuestToLoginInProduction } from "./redirect-guest-to-login";

describe("redirectGuestToLoginInProduction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    redirect.mockClear();
  });

  it("sends a production guest to the owner login and back to the page afterwards", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => redirectGuestToLoginInProduction(null, "/business/dashboard")).toThrow("NEXT_REDIRECT:/business/owner/login?next=%2Fbusiness%2Fdashboard");
    expect(() => redirectGuestToLoginInProduction(null, "/business/trial")).toThrow("NEXT_REDIRECT:/business/owner/login?next=%2Fbusiness%2Ftrial");
  });

  it("does nothing for a signed-in viewer in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    redirectGuestToLoginInProduction({ id: "u1" }, "/business/dashboard");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("lets a guest stay on the page in development (demo switcher available)", () => {
    vi.stubEnv("NODE_ENV", "development");
    redirectGuestToLoginInProduction(null, "/business/dashboard");
    expect(redirect).not.toHaveBeenCalled();
  });
});
