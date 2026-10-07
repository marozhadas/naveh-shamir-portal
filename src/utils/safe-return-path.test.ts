import { describe, expect, it } from "vitest";
import { registrationReturnPath, safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  it("accepts owner-area paths, including a query string", () => {
    expect(safeReturnPath("/business/register/premium?interval=yearly")).toBe("/business/register/premium?interval=yearly");
    expect(safeReturnPath("/business/dashboard")).toBe("/business/dashboard");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeReturnPath("https://evil.example/business/x")).toBeNull();
    expect(safeReturnPath("//evil.example")).toBeNull();
    expect(safeReturnPath("/business//evil.example")).toBeNull();
  });

  it("rejects other site sections, backslashes and control characters", () => {
    expect(safeReturnPath("/admin")).toBeNull();
    expect(safeReturnPath("/business/\\evil")).toBeNull();
    expect(safeReturnPath("/business/x\n")).toBe("/business/x");
    expect(safeReturnPath("/business/x\u0000y")).toBeNull();
  });

  it("rejects empty, missing and oversized values", () => {
    expect(safeReturnPath("")).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath(`/business/${"a".repeat(400)}`)).toBeNull();
  });
});

describe("registrationReturnPath", () => {
  it("keeps plan and billing interval", () => {
    expect(registrationReturnPath("premium", "yearly")).toBe("/business/register/premium?interval=yearly");
    expect(registrationReturnPath("plus", "monthly")).toBe("/business/register/plus?interval=monthly");
  });
});
