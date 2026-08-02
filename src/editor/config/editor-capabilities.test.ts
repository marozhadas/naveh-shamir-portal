import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEditorEnabled } from "./editor-capabilities";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  vi.stubEnv("NODE_ENV", value);
}

afterEach(() => {
  vi.unstubAllEnvs();
  setNodeEnv(ORIGINAL_NODE_ENV ?? "test");
});

describe("isEditorEnabled — development", () => {
  beforeEach(() => setNodeEnv("development"));

  it("is on by default with no query param at all", () => {
    expect(isEditorEnabled(null, false)).toBe(true);
  });

  it("stays on with ?editor=true, regardless of admin status", () => {
    expect(isEditorEnabled(new URLSearchParams("editor=true"), false)).toBe(true);
  });

  it("can be explicitly forced off with ?editor=false", () => {
    expect(isEditorEnabled(new URLSearchParams("editor=false"), false)).toBe(false);
  });
});

describe("isEditorEnabled — production", () => {
  beforeEach(() => setNodeEnv("production"));

  it("is off with neither the query param nor an admin session", () => {
    expect(isEditorEnabled(null, false)).toBe(false);
  });

  it("stays off for an admin session alone, without ?editor=true", () => {
    expect(isEditorEnabled(null, true)).toBe(false);
  });

  it("stays off for ?editor=true alone, without a real admin session — this is the exact case a public visitor could trigger and must never work", () => {
    expect(isEditorEnabled(new URLSearchParams("editor=true"), false)).toBe(false);
  });

  it("is on only when both an admin session and ?editor=true are present", () => {
    expect(isEditorEnabled(new URLSearchParams("editor=true"), true)).toBe(true);
  });
});
