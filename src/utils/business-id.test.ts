import { describe, expect, it } from "vitest";
import { isSupabaseBusinessId, toBusinessId, toRegistrationId } from "./business-id";

describe("business-id", () => {
  it("recognizes a Supabase-backed business id by its reg- prefix", () => {
    expect(isSupabaseBusinessId("reg-11111111-1111-1111-1111-111111111111")).toBe(true);
  });

  it("does not treat a static mock id as Supabase-backed", () => {
    expect(isSupabaseBusinessId("d1")).toBe(false);
  });

  it("toBusinessId prefixes a raw registration uuid", () => {
    expect(toBusinessId("11111111-1111-1111-1111-111111111111")).toBe("reg-11111111-1111-1111-1111-111111111111");
  });

  it("toRegistrationId strips the prefix back off", () => {
    expect(toRegistrationId("reg-11111111-1111-1111-1111-111111111111")).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("toBusinessId and toRegistrationId round-trip", () => {
    const raw = "22222222-2222-2222-2222-222222222222";
    expect(toRegistrationId(toBusinessId(raw))).toBe(raw);
  });
});
