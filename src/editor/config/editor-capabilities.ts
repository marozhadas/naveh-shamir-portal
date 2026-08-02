/**
 * Single source of truth for whether Editor Mode may render at all.
 * No component should read process.env.NODE_ENV, process.env.NEXT_PUBLIC_*,
 * or a query param directly — always go through this helper, so a future
 * real permission check (login, role) only needs to change in one place.
 *
 * - In development, `?editor=true` enables it (see the dev-default note below).
 * - In production, it's hidden unless BOTH are true: the caller has a real,
 *   server-verified admin session (see isAdminAuthenticated() in
 *   src/lib/admin-session.ts) AND the explicit `?editor=true` query param is
 *   present. A NEXT_PUBLIC_* env var was deliberately dropped from this
 *   check — it ships in the client bundle, so it can never be a real
 *   authorization boundary, only a config toggle. `isAdmin` must be resolved
 *   server-side by the caller (a query param or client-visible flag can't be
 *   trusted to prove who's asking) and passed in here.
 */
export function isEditorEnabled(searchParams: URLSearchParams | null | undefined, isAdmin: boolean): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const queryFlag = searchParams?.get("editor") === "true";

  if (!isProduction) {
    // Dev-default: on with no query param at all, per the already-approved plan
    // (spec section 2 explicitly allows keeping this if it matches prior planning).
    // ?editor=false lets a developer explicitly force it off for a quick check.
    return searchParams?.get("editor") !== "false";
  }

  return queryFlag && isAdmin;
}
