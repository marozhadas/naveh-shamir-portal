"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cancelPayMeSubscriptionAction } from "@/app/business/dashboard/payment-actions";

/** Two-step cancel (click, then confirm). Cancelling never deletes content and keeps access through the trial / the period already paid. */
export function CancelPayMeSubscriptionButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelPayMeSubscriptionAction();
      if (result.status === "success") {
        router.refresh();
        return;
      }
      setError(result.message ?? "אירעה תקלה.");
      setConfirming(false);
    });
  }

  if (!confirming) {
    return (
      <div>
        <Button type="button" variant="secondary" size="compact" onClick={() => setConfirming(true)}>
          ביטול המנוי
        </Button>
        {error && (
          <p role="alert" style={{ color: "var(--color-error, #b3261e)", fontSize: "var(--fs-body-sm)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div role="alertdialog" aria-label="אישור ביטול המנוי">
      <p style={{ fontSize: "var(--fs-body-sm)" }}>
        לבטל את המנוי? העמוד יישאר פעיל עד סוף תקופת הניסיון או התקופה ששולמה, התוכן ישמר, ולא יתבצעו חיובים נוספים.
      </p>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button type="button" variant="secondary" size="compact" onClick={() => setConfirming(false)} disabled={isPending}>
          חזרה
        </Button>
        <Button type="button" variant="accent" size="compact" onClick={handleConfirm} disabled={isPending}>
          {isPending ? "מבטל…" : "כן, לבטל את המנוי"}
        </Button>
      </div>
    </div>
  );
}
