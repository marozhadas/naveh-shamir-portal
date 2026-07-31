export type ShareInput = {
  title: string;
  text?: string;
  url: string;
};

export type ShareResult = { method: "web-share" } | { method: "clipboard" } | { method: "unavailable" };

/**
 * Uses the Web Share API when available (mobile browsers, mostly); falls back to copying the
 * link to the clipboard. Never throws on a user-initiated cancel (AbortError) — that's not a
 * failure, just "they changed their mind".
 */
export async function shareContent(input: ShareInput): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(input);
      return { method: "web-share" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { method: "web-share" };
      }
      // Fall through to the clipboard fallback below.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(input.url);
    return { method: "clipboard" };
  }

  return { method: "unavailable" };
}
