"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Plays a short local "ding" — only when `enabled`, and only after the user has interacted with
 * the page at least once (browsers block audio autoplay before that; this also means a page
 * refresh never plays a sound on its own, since nothing has happened yet to play it for).
 */
export function useAdminNotificationSound(enabled: boolean) {
  const hasInteractedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    function markInteracted() {
      hasInteractedRef.current = true;
    }
    window.addEventListener("pointerdown", markInteracted, { once: true });
    window.addEventListener("keydown", markInteracted, { once: true });
    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  return useCallback(() => {
    if (!enabled || !hasInteractedRef.current) return;
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/admin-notification.wav");
      audioRef.current.volume = 0.5;
    }
    audioRef.current.currentTime = 0;
    void audioRef.current.play().catch(() => {
      // Autoplay can still be refused by the browser in edge cases — failing silently is correct here, not an error.
    });
  }, [enabled]);
}
