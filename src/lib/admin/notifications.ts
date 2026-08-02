import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { AdminNotificationRow, AdminNotificationStatus, AdminNotificationType, AdminNotificationWithReadState } from "@/types/admin-notification";

export type NotificationFilters = {
  status?: AdminNotificationStatus | "all" | "unread";
  type?: AdminNotificationType | "all";
  sort?: "newest" | "oldest" | "priority";
};

/** Joins each notification with whether `adminId` has read it — used everywhere a list renders. */
async function attachReadState(
  notifications: AdminNotificationRow[],
  adminId: string,
): Promise<AdminNotificationWithReadState[]> {
  if (notifications.length === 0) return [];
  const supabase = createAdminSupabaseClient();
  const { data: reads } = await supabase
    .from("admin_notification_reads")
    .select("notification_id")
    .eq("admin_id", adminId)
    .in(
      "notification_id",
      notifications.map((n) => n.id),
    );
  const readIds = new Set((reads ?? []).map((r) => r.notification_id));
  return notifications.map((n) => ({ ...n, isRead: readIds.has(n.id) }));
}

export async function listNotifications(adminId: string, filters: NotificationFilters = {}): Promise<AdminNotificationWithReadState[]> {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("admin_notifications").select("*");

  if (filters.status === "unread") {
    // Handled after fetch (read-state lives in a separate table) — fetch open+resolved+dismissed, filter below.
  } else if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (filters.sort === "priority") {
    // Postgres has no implicit priority ordering — order client-side below for exact control.
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let withReadState = await attachReadState(data ?? [], adminId);

  if (filters.status === "unread") {
    withReadState = withReadState.filter((n) => !n.isRead);
  }

  if (filters.sort === "priority") {
    const priorityRank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    withReadState = [...withReadState].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  }

  return withReadState;
}

export async function listRecentNotifications(adminId: string, limit: number): Promise<AdminNotificationWithReadState[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return attachReadState(data ?? [], adminId);
}

export async function countOpenNotifications(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase.from("admin_notifications").select("*", { count: "exact", head: true }).eq("status", "open");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Marks a notification as read for this admin. Read is purely a "seen it" marker — it never closes the notification. */
export async function markNotificationRead(notificationId: string, adminId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("admin_notification_reads")
    .upsert({ notification_id: notificationId, admin_id: adminId }, { onConflict: "notification_id,admin_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/**
 * Closes the open notification tied to a given entity (e.g. a business registration) — called
 * from the approve/reject flow, never from the browser. No-ops if there's no matching open
 * notification (already resolved, or none was ever created), so it's safe to call unconditionally.
 */
export async function resolveNotificationForEntity(entityType: string, entityId: string, adminId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("admin_notifications")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: adminId })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "open");
  if (error) throw new Error(error.message);
}

export async function getNotificationById(notificationId: string): Promise<AdminNotificationRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("admin_notifications").select("*").eq("id", notificationId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Finds the notification the DB trigger created for a given entity — used right after an insert to attach the email-send outcome to it. */
export async function getOpenNotificationForEntity(entityType: string, entityId: string): Promise<AdminNotificationRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "open")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Same lookup regardless of status — used on the business detail page, which is still viewable after the notification has been resolved. */
export async function getNotificationForEntity(entityType: string, entityId: string): Promise<AdminNotificationRow | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function recordEmailAttempt(
  notificationId: string,
  result: { status: "sent" | "failed" | "skipped"; error?: string },
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const notification = await getNotificationById(notificationId);
  const nextAttempts = (notification?.email_attempts ?? 0) + 1;
  const { error } = await supabase
    .from("admin_notifications")
    .update({
      email_status: result.status,
      email_error: result.status === "failed" ? (result.error ?? "שגיאה לא ידועה") : (result.error ?? null),
      email_sent_at: result.status === "sent" ? new Date().toISOString() : null,
      email_attempts: nextAttempts,
      last_email_attempt_at: new Date().toISOString(),
    })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
}
