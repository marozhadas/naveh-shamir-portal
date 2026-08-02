import "server-only";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";
import type { BusinessNotificationRow } from "@/lib/supabase/database.types";

const MILESTONE_LABEL: Record<BusinessNotificationRow["type"], string> = {
  "trial-expiring-7": "נותרו 7 ימים לתקופת הניסיון שלכם.",
  "trial-expiring-3": "נותרו 3 ימים לתקופת הניסיון שלכם.",
  "trial-expiring-1": "נותר יום אחד לתקופת הניסיון שלכם.",
  "trial-expired": "תקופת הניסיון שלכם הסתיימה.",
};

export type OwnerTrialNotification = { id: string; message: string; createdAt: string };

/**
 * Reads the milestone rows written by the hourly notify_expiring_trials() Postgres function (see
 * the create_business_notifications migration) — the UI layer for the "prep infrastructure" the
 * spec asked for. Only the most recent unread milestone is surfaced; there's no mark-as-read
 * action yet (deferred — this is in-system prep, not the full notification center).
 */
export async function getLatestUnreadTrialNotification(ownerId: string): Promise<OwnerTrialNotification | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_notifications")
    .select("id, type, created_at")
    .eq("owner_id", ownerId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, message: MILESTONE_LABEL[data.type], createdAt: data.created_at };
}
