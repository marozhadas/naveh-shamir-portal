import type { AuthenticatedUser } from "@/types/auth";

/**
 * Demo accounts for the mock auth adapter (src/adapters/mock-auth-adapter.ts) — there is no
 * real signup/login in this phase, so these are the only "users" that can ever exist. Each owns
 * exactly one demo business, matching src/data/business-profiles.ts.
 */
export const DEMO_USERS: Record<string, AuthenticatedUser> = {
  "owner-1": { id: "owner-1", name: "בעלת סטודיו נועה", role: "business-owner", ownedBusinessIds: ["d1"] },
  "owner-3": { id: "owner-3", name: "בעלת המטבח של רוני", role: "business-owner", ownedBusinessIds: ["d3"] },
  "owner-13": { id: "owner-13", name: "בעל פיקס לבית", role: "business-owner", ownedBusinessIds: ["d13"] },
  "owner-2": { id: "owner-2", name: "בעלת מספרת קו הבית", role: "business-owner", ownedBusinessIds: ["d2"] },
  "owner-15": { id: "owner-15", name: "בעל חשמלאי מוסמך בשכונה", role: "business-owner", ownedBusinessIds: ["d15"] },
  "admin-1": { id: "admin-1", name: "מנהלת הפורטל", role: "admin", ownedBusinessIds: [] },
};

export const DEMO_GUEST_USER: AuthenticatedUser = { id: "guest", name: "אורח/ת", role: "guest", ownedBusinessIds: [] };
