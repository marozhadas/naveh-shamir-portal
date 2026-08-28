import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

/** How long a hit is remembered for, regardless of any caller's own window — bounds the table's growth without a cron job (see the cleanup below). */
const MAX_HIT_AGE_SECONDS = 3600;

/**
 * Simple DB-backed sliding-window rate limiter — no external service (Redis/Upstash) is set up
 * for this project, and marketplace/manage's traffic volume doesn't warrant adding one. Counts
 * hits for `key` within the last `windowSeconds`; if under `maxHits`, records this call as a new
 * hit and allows it, otherwise refuses. Fails OPEN (allows the request) on an infra error — a
 * rate limiter that itself takes the site down on a transient DB hiccup would be worse than the
 * abuse it's meant to prevent.
 */
export async function checkRateLimit(key: string, maxHits: number, windowSeconds: number): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return true;
  const admin = createAdminSupabaseClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await admin.from("rate_limit_hits").select("*", { count: "exact", head: true }).eq("rate_key", key).gte("created_at", windowStart);
  if (error) {
    console.error("[checkRateLimit] count failed:", error.message);
    return true;
  }
  if ((count ?? 0) >= maxHits) return false;

  const { error: insertError } = await admin.from("rate_limit_hits").insert({ rate_key: key });
  if (insertError) console.error("[checkRateLimit] insert failed:", insertError.message);

  // Best-effort cleanup of this key's own old rows — self-maintaining without a scheduled job.
  const staleBefore = new Date(Date.now() - MAX_HIT_AGE_SECONDS * 1000).toISOString();
  const { error: cleanupError } = await admin.from("rate_limit_hits").delete().eq("rate_key", key).lt("created_at", staleBefore);
  if (cleanupError) console.error("[checkRateLimit] cleanup failed:", cleanupError.message);

  return true;
}
