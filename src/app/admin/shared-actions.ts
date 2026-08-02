"use server";

import { destroyAdminSession, getAdminId, isAdminAuthenticated } from "@/lib/admin-session";
import { countOpenNotifications, listRecentNotifications, markNotificationRead } from "@/lib/admin/notifications";
import { countPendingRegistrations } from "@/lib/admin/business-registrations";
import { recordAuditLog } from "@/lib/admin/audit-log";
import { redirect } from "next/navigation";
import type { AdminNotificationWithReadState } from "@/types/admin-notification";

/**
 * Lives outside the `(protected)` route group deliberately: Turbopack in this project fails to
 * resolve `@/` alias imports that point INTO a parenthesized folder, so any Server Action shared
 * across client components (which must import via the `@/` alias, not a relative path) needs to
 * live somewhere the alias can safely reach.
 */

export async function adminLogoutAction(): Promise<void> {
  const adminId = (await isAdminAuthenticated()) ? getAdminId() : null;
  if (adminId) await recordAuditLog({ adminId, action: "admin-logout" });
  await destroyAdminSession();
  redirect("/admin/login");
}

export type NotificationSnapshot = {
  openNotificationsCount: number;
  pendingBusinessesCount: number;
  recentNotifications: AdminNotificationWithReadState[];
};

/** Polled by the admin shell (sidebar badges + notification bell) every few seconds. Server-gated by the session cookie — never exposes admin_notifications rows to a browser-side Supabase client. */
export async function getNotificationSnapshotAction(): Promise<NotificationSnapshot> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  const adminId = getAdminId();
  const [openNotificationsCount, pendingBusinessesCount, recentNotifications] = await Promise.all([
    countOpenNotifications(),
    countPendingRegistrations(),
    listRecentNotifications(adminId, 5),
  ]);
  return { openNotificationsCount, pendingBusinessesCount, recentNotifications };
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  if (!(await isAdminAuthenticated())) throw new Error("Not authenticated.");
  await markNotificationRead(notificationId, getAdminId());
}
