import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours — re-enter the password after that.

/** Passwords that must never be accepted once NODE_ENV=production, even if someone sets them. */
const INSECURE_PRODUCTION_PASSWORDS = new Set(["1234"]);

/**
 * The cookie never holds the raw password — it holds a hash of it, so the password itself isn't
 * sitting in the browser's cookie jar even in this deliberately simple (no real accounts)
 * scheme. This is not a substitute for real authentication; it matches what was actually asked
 * for (a single shared password gate for a low-stakes internal page).
 */
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * Non-null only when admin login must be refused outright — missing ADMIN_PASSWORD, or a known
 * insecure default, in production. Callers must check this BEFORE rendering the login form or
 * accepting a password, and show it as a server-side configuration error instead.
 */
export function getAdminConfigError(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV !== "production") return null;
  if (!password) return "משתנה הסביבה ADMIN_PASSWORD אינו מוגדר ב-Production.";
  if (INSECURE_PRODUCTION_PASSWORDS.has(password)) {
    return "ADMIN_PASSWORD מוגדר לערך ברירת מחדל לא מאובטח. יש לשנות אותו ב-Vercel לפני שניתן יהיה להתחבר.";
  }
  return null;
}

export function getAdminPassword(): string | null {
  if (getAdminConfigError()) return null;
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

/**
 * Placeholder admin identity. There is no real account system yet — one shared password gates
 * the whole /admin area — so there is no per-person user id to attribute reads/audit-log rows to.
 * Rather than hardcode a fake constant UUID around the codebase, this single function derives a
 * stable, deployment-scoped id from the (never-logged) password itself. It changes only if
 * ADMIN_PASSWORD is rotated, which is an acceptable, honest limitation of a single-admin system.
 * When real Supabase Auth accounts are introduced, this is the one place to swap for `auth.uid()`.
 */
export function getAdminId(): string {
  const password = getAdminPassword();
  if (!password) throw new Error("ADMIN_PASSWORD is not configured.");
  const hash = createHash("sha256").update(`admin-placeholder-id:${password}`).digest("hex");
  return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join("-");
}
