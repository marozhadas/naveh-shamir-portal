import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate-limiting only — never treat this as a verified identity (it's
 * client-supplied-adjacent and trivially spoofable outside of Vercel's own edge network, which
 * does set x-forwarded-for itself before the request reaches the app). Falls back to a constant
 * key when absent so requests without any IP header still share one (conservative) bucket rather
 * than bypassing the limit entirely.
 */
export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return requestHeaders.get("x-real-ip") ?? "unknown";
}
