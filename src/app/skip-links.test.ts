import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

const SRC = path.resolve(__dirname, "..");

describe("skip link (WCAG 2.4.1)", () => {
  // Every public page that draws the site header and a <main id="main-content"> must offer "דלגו לתוכן הראשי" before the header.
  const pages = walk(SRC).filter((file) => {
    const source = readFileSync(file, "utf8");
    return source.includes("<ConnectedHeader") && source.includes('id="main-content"');
  });

  it("finds the pages to check", () => {
    expect(pages.length).toBeGreaterThan(20);
  });

  it("every such page links to #main-content before the header", () => {
    const missing: string[] = [];
    for (const file of pages) {
      const source = readFileSync(file, "utf8");
      const skip = source.indexOf('href="#main-content"');
      const header = source.indexOf("<ConnectedHeader");
      if (skip === -1 || skip > header) missing.push(path.relative(SRC, file));
    }
    expect(missing).toEqual([]);
  });
});
