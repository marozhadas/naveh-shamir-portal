"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationSnapshot } from "@/app/admin/shared-actions";

const POLL_INTERVAL_MS = 15_000;

type UseAdminNotificationPollingOptions = {
  initialSnapshot: NotificationSnapshot;
  fetchSnapshot: () => Promise<NotificationSnapshot>;
  onNewNotifications?: (newCount: number) => void;
};

/**
 * Secure stand-in for Supabase Realtime: admin_notifications intentionally has zero RLS policies
 * for anon/authenticated (see the create_admin_notification_system migration and part ט"ו of the
 * spec), and there is no real per-admin Supabase Auth session yet to authorize a private Realtime
 * channel — so a direct browser subscription would either leak data or require weakening that
 * guarantee. This polls a session-cookie-gated Server Action instead, which keeps the same
 * "no public read access" property while still updating badges/popover/dashboard without a full
 * page refresh. Swap this for a true Realtime channel once real Supabase Auth accounts exist.
 */
export function useAdminNotificationPolling({ initialSnapshot, fetchSnapshot, onNewNotifications }: UseAdminNotificationPollingOptions) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const knownIdsRef = useRef(new Set(initialSnapshot.recentNotifications.map((n) => n.id)));
  const onNewNotificationsRef = useRef(onNewNotifications);
  useEffect(() => {
    onNewNotificationsRef.current = onNewNotifications;
  }, [onNewNotifications]);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSnapshot();
      const newIds = next.recentNotifications.filter((n) => !knownIdsRef.current.has(n.id));
      if (newIds.length > 0) onNewNotificationsRef.current?.(newIds.length);
      knownIdsRef.current = new Set(next.recentNotifications.map((n) => n.id));
      setSnapshot(next);
    } catch {
      // A transient poll failure just keeps the last known snapshot on screen — not worth an error UI.
    }
  }, [fetchSnapshot]);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { snapshot, refresh, setSnapshot };
}
