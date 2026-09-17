import { describe, expect, it } from "vitest";
import { countWords, MAX_REVIEW_WORDS } from "./word-count";

describe("countWords", () => {
  it("counts simple space-separated words", () => {
    expect(countWords("שלום עולם")).toBe(2);
  });

  it("returns 0 for an empty or whitespace-only string", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });

  it("ignores leading/trailing whitespace", () => {
    expect(countWords("  שלום עולם  ")).toBe(2);
  });

  it("collapses repeated internal whitespace into a single separator", () => {
    expect(countWords("שלום    עולם")).toBe(2);
  });

  it("counts across newlines too", () => {
    expect(countWords("שלום\nעולם\nשוב")).toBe(3);
  });

  it("a single word with no whitespace is 1", () => {
    expect(countWords("שלום")).toBe(1);
  });

  it("200 words exactly is at the limit, 201 exceeds it", () => {
    const twoHundred = Array.from({ length: 200 }, () => "מילה").join(" ");
    const twoHundredOne = `${twoHundred} מילה`;
    expect(countWords(twoHundred)).toBe(MAX_REVIEW_WORDS);
    expect(countWords(twoHundredOne)).toBe(MAX_REVIEW_WORDS + 1);
  });

  it("a long single 'word' (no spaces) still counts as 1, even if it has many characters", () => {
    expect(countWords("א".repeat(500))).toBe(1);
  });
});
