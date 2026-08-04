"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteBusinessAction } from "./actions";

type DeleteBusinessButtonProps = {
  registrationId: string;
  businessName: string;
  /** Only needed when deleting takes the admin somewhere the deleted row no longer exists (the detail/edit page) — omit when deleting inline from a list, where a refresh is enough. */
  redirectTo?: string;
};

export function DeleteBusinessButton({ registrationId, businessName, redirectTo }: DeleteBusinessButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`למחוק לצמיתות את "${businessName}"? הפעולה תמחק גם את המנוי, התמונות וההיסטוריה שלו ואינה הפיכה.`)) return;
    startTransition(async () => {
      await deleteBusinessAction(registrationId);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" icon={<Trash2 size={16} aria-hidden="true" />} disabled={isPending} onClick={handleDelete}>
      {isPending ? "מוחק…" : "מחיקת העסק"}
    </Button>
  );
}
