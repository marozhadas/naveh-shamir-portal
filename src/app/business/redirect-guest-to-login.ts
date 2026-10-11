import { redirect } from "next/navigation";
import { isDemoModeEnabled } from "@/lib/demo-mode";

/**
 * Owner-only pages (dashboard, trial). In production a visitor without a real session is sent to the owner login, and
 * comes back to `returnTo` afterwards (the login page validates `next` with safeReturnPath). In development the demo
 * viewer switcher is still available, so a guest stays on the page.
 */
export function redirectGuestToLoginInProduction(viewer: unknown, returnTo: string): void {
  if (viewer) return;
  if (isDemoModeEnabled()) return;
  redirect(`/business/owner/login?next=${encodeURIComponent(returnTo)}`);
}
