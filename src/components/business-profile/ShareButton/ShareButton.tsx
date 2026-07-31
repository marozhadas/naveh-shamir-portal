"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { shareContent } from "@/utils/share-content";
import styles from "./ShareButton.module.css";

type ShareButtonProps = {
  title: string;
  text?: string;
  url: string;
  variant?: "primary" | "secondary" | "accent" | "whatsapp";
  size?: "default" | "compact";
};

export function ShareButton({ title, text, url, variant = "secondary", size = "default" }: ShareButtonProps) {
  const [toast, setToast] = useState<string | null>(null);

  async function handleShare() {
    const result = await shareContent({ title, text, url });
    // The native share sheet (web-share) is its own feedback — only clipboard/unavailable need a toast.
    if (result.method === "web-share") return;
    setToast(result.method === "clipboard" ? "הקישור הועתק" : "לא ניתן לשתף מהדפדפן הזה");
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className={styles.wrap}>
      <Button variant={variant} size={size} icon={<Share2 size={15} aria-hidden="true" />} onClick={() => void handleShare()}>
        שיתוף
      </Button>
      {toast && (
        <span className={styles.toast} role="status" aria-live="polite">
          {toast}
        </span>
      )}
    </div>
  );
}
