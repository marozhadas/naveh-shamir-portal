import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";

vi.mock("server-only", () => ({}));

const resolveBusinessView = vi.fn();
vi.mock("./resolve-business-view", () => ({ resolveBusinessView: (...args: unknown[]) => resolveBusinessView(...args) }));

const { default: BusinessSlugLayout } = await import("./layout");

const CHILD = "child-marker";
const params = (slug: string) => Promise.resolve({ slug });

/** The error Next.js throws for notFound() / permanentRedirect(): a real 404 / 308 depends on these propagating out of the layout. */
function digestOf(fn: () => never): string {
  try {
    fn();
  } catch (error) {
    return String((error as { digest?: string }).digest);
  }
  throw new Error("did not throw");
}
const NOT_FOUND_DIGEST = digestOf(() => notFound());
const REDIRECT_DIGEST_PREFIX = "NEXT_REDIRECT";

describe("src/app/businesses/[slug]/layout.tsx — a real 404 for a slug that does not exist", () => {
  beforeEach(() => {
    resolveBusinessView.mockReset();
  });

  it("1. a slug that does not exist → notFound() (HTTP 404) before anything is rendered", async () => {
    resolveBusinessView.mockResolvedValue({ kind: "not-found" });
    await expect(BusinessSlugLayout({ children: CHILD, params: params("does-not-exist") })).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST });
    expect(resolveBusinessView).toHaveBeenCalledWith("does-not-exist");
  });

  it("2. a published business → renders its children (HTTP 200), nothing is thrown", async () => {
    resolveBusinessView.mockResolvedValue({ kind: "published", business: { id: "reg-1" }, viewer: null, access: {} });
    await expect(BusinessSlugLayout({ children: CHILD, params: params("hadas-design") })).resolves.toBe(CHILD);
  });

  it("3. a pending business its owner may see → renders exactly as before (the page still decides what to show)", async () => {
    resolveBusinessView.mockResolvedValue({ kind: "preview", business: { id: "reg-2", status: "pending-review" }, viewer: { id: "owner" }, access: {} });
    await expect(BusinessSlugLayout({ children: CHILD, params: params("my-pending-business") })).resolves.toBe(CHILD);
  });

  it("4. an owner/admin preview of a draft or suspended business → renders as before", async () => {
    for (const status of ["draft", "suspended", "pending-review"]) {
      resolveBusinessView.mockResolvedValue({ kind: "preview", business: { id: "reg-3", status }, viewer: { id: "admin", role: "admin" }, access: {} });
      await expect(BusinessSlugLayout({ children: CHILD, params: params("x") })).resolves.toBe(CHILD);
    }
  });

  it("a business that exists but is not available to this visitor stays a normal page (the page shows its own message) — only a missing slug is a 404", async () => {
    resolveBusinessView.mockResolvedValue({ kind: "unavailable" });
    await expect(BusinessSlugLayout({ children: CHILD, params: params("hidden-business") })).resolves.toBe(CHILD);
  });

  it("6. an old slug: the redirect resolveBusinessView throws is NOT swallowed — it reaches Next before streaming, so it is a real 308", async () => {
    // the error resolveBusinessView raises for an old slug: permanentRedirect() throws an Error whose digest is
    // "NEXT_REDIRECT;<type>;<url>;<status>;" (308 = permanent). The layout must let it through untouched.
    const digest = "NEXT_REDIRECT;replace;/businesses/new-slug;308;";
    const redirectError = Object.assign(new Error("old-slug redirect"), { digest });
    resolveBusinessView.mockImplementation(async () => {
      await Promise.resolve();
      throw redirectError;
    });
    await expect(BusinessSlugLayout({ children: CHILD, params: params("old-slug") })).rejects.toMatchObject({ digest });
    expect(digest.startsWith(REDIRECT_DIGEST_PREFIX)).toBe(true);
  });

  it("passes the raw route slug (percent-encoded Hebrew included) straight to the single source of truth, which normalises it", async () => {
    resolveBusinessView.mockResolvedValue({ kind: "published", business: { id: "reg-1" }, viewer: null, access: {} });
    await BusinessSlugLayout({ children: CHILD, params: params("%D7%A2%D7%A1%D7%A7") });
    expect(resolveBusinessView).toHaveBeenCalledWith("%D7%A2%D7%A1%D7%A7");
  });
});

describe("the loading state is untouched, and nothing above the slug layout can start streaming first", () => {
  const businessesDir = path.resolve(__dirname, "..");

  it("5. [slug]/loading.tsx still exists (the profile skeleton)", () => {
    expect(fs.existsSync(path.join(__dirname, "loading.tsx"))).toBe(true);
    expect(fs.readFileSync(path.join(__dirname, "loading.tsx"), "utf8")).toContain("BusinessProfileSkeleton");
  });

  it("the list page keeps its own loading.tsx — moved into the (archive) route group together with its page, URLs unchanged", () => {
    expect(fs.existsSync(path.join(businessesDir, "(archive)", "loading.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(businessesDir, "(archive)", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(businessesDir, "page.tsx"))).toBe(false);
  });

  it("no loading.tsx sits directly in /businesses: a Suspense boundary above [slug]/layout would start the response (status 200) before the layout can 404", () => {
    expect(fs.existsSync(path.join(businessesDir, "loading.tsx"))).toBe(false);
  });

  it("the same \"העסק לא נמצא\" screen is served for the 404: not-found.tsx exists at /businesses (where a layout's notFound() lands) and re-exports the [slug] one", () => {
    const parent = fs.readFileSync(path.join(businessesDir, "not-found.tsx"), "utf8");
    expect(parent).toMatch(/export \{ default \} from "\.\/\[slug\]\/not-found"/);
    expect(fs.existsSync(path.join(__dirname, "not-found.tsx"))).toBe(true);
  });
});
