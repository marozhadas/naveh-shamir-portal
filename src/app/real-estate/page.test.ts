import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NAV_LINKS } from "@/data/navigation";
import { HERO_SHORTCUTS } from "@/data/hero-shortcuts";
import { STATIC_SITEMAP_PATHS } from "@/lib/seo/sitemap-entries";

const page = readFileSync(path.resolve(__dirname, "page.tsx"), "utf8");

describe("/real-estate (coming soon) and the renamed second-hand section", () => {
  it("the page says 'בקרוב', is noindex and has a skip link", () => {
    expect(page).toContain('<p className={styles.text}>בקרוב</p>');
    expect(page).toMatch(/robots: \{ index: false/);
    expect(page).toContain('href="#main-content"');
  });

  it("the main navigation links to it, right after the second-hand board", () => {
    const ids = NAV_LINKS.map((link) => link.id);
    expect(NAV_LINKS.find((link) => link.id === "real-estate")).toMatchObject({ label: "נדל״ן בשכונה", href: "/real-estate" });
    expect(ids.indexOf("real-estate")).toBe(ids.indexOf("marketplace") + 1);
  });

  it("the marketplace is called 'יד שניה' in the navigation and in the hero shortcuts", () => {
    expect(NAV_LINKS.find((link) => link.id === "marketplace")?.label).toBe("יד שניה");
    expect(HERO_SHORTCUTS.find((shortcut) => shortcut.id === "marketplace")?.label).toBe("יד שניה");
    expect([...NAV_LINKS, ...HERO_SHORTCUTS].map((item) => item.label)).not.toContain("מסירה ומכירה");
  });

  it("a placeholder page stays out of the sitemap", () => {
    expect(STATIC_SITEMAP_PATHS).not.toContain("/real-estate");
  });
});
