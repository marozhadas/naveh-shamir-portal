import { describe, expect, it } from "vitest";
import { buildBusinessManagementUrl } from "./business-management-token";

describe("buildBusinessManagementUrl", () => {
  it("joins the origin and token into a /business/manage/ path", () => {
    expect(buildBusinessManagementUrl("https://example.com", "abc123")).toBe("https://example.com/business/manage/abc123");
  });
});
