export type UserRole = "guest" | "resident" | "business-owner" | "admin";

export type AuthenticatedUser = {
  id: string;
  name: string;
  role: UserRole;
  /** Business ids this user owns (only meaningful for `role: "business-owner"`). */
  ownedBusinessIds: string[];
};
