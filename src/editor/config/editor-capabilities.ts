/**
 * Single source of truth for whether Editor Mode may render at all.
 * No component should read process.env.NODE_ENV, process.env.NEXT_PUBLIC_*,
 * or a query param directly — always go through this helper, so a future
 * real permission check (login, role) only needs to change in one place.
 *
 * - In development, `?editor=true` enables it (see the dev-default note below).
 * - In production, it's hidden unless BOTH are true: the explicit
 *   `?editor=true` query param AND the NEXT_PUBLIC_ENABLE_VISUAL_EDITOR=true
 *   env var. Neither one alone is enough in production — this is the "env
 *   var required in addition to the query param" gate the spec asks for.
 */
export function isEditorEnabled(searchParams?: URLSearchParams | null): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const queryFlag = searchParams?.get("editor") === "true";

  if (!isProduction) {
    // Dev-default: on with no query param at all, per the already-approved plan
    // (spec section 2 explicitly allows keeping this if it matches prior planning).
    // ?editor=false lets a developer explicitly force it off for a quick check.
    return searchParams?.get("editor") !== "false";
  }

  const envAllows = process.env.NEXT_PUBLIC_ENABLE_VISUAL_EDITOR === "true";
  return queryFlag && envAllows;
}
