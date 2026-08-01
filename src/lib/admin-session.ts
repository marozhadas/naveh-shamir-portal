import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours — re-enter the password after that.

/**
 * The cookie never holds the raw password — it holds a hash of it, so the password itself isn't
 * sitting in the browser's cookie jar even in this deliberately simple (no real accounts)
 * scheme. This is not a substitute for real authentication; it matches what was actually asked
 * for (a single shared password gate for a low-stakes internal page).
 */
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

export async function createAdminSession(): Promise<void> {
  const password = getAdminPassword();
  if (!password) throw new Error("ADMIN_PASSWORD is not configured.");
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, hashPassword(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: ADMIN_SESSION_COOKIE, path: "/admin" });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const password = getAdminPassword();
  if (!password) return false;
  const store = await cookies();
  const sessionValue = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionValue) return false;

  const expected = Buffer.from(hashPassword(password));
  const actual = Buffer.from(sessionValue);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function checkAdminPassword(candidate: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  const expected = Buffer.from(hashPassword(password));
  const actual = Buffer.from(hashPassword(candidate));
  return timingSafeEqual(expected, actual);
}
