import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { SubscriptionStatusCard } from "@/components/business-dashboard/SubscriptionStatusCard/SubscriptionStatusCard";
import { resolveDashboardViewer } from "../resolve-dashboard-viewer";
import { submitForReviewAction } from "../actions";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "דשבורד עסק | נווה שמיר", robots: { index: false, follow: false } };

const STATUS_LABEL: Record<string, string> = {
  draft: "טיוטה",
  "pending-review": "ממתין לאישור",
  published: "מפורסם",
  suspended: "מושהה",
  archived: "בארכיון",
};

export default async function BusinessDashboardPage() {
  const view = await resolveDashboardViewer();

  if (view.kind === "signed-out") {
    return <p className={styles.notice}>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לצפות בדשבורד — ניתן לבחור זהות בסרגל הצהוב למעלה.</p>;
  }

  if (view.kind === "no-business") {
    return <p className={styles.notice}>לא נמצא עסק המשויך לחשבון זה.</p>;
  }

  const { business, subscription, access } = view;
  const canSubmitForReview = business.status === "draft" && access?.canPublish === true;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>סקירה כללית</p>
          <h1 className={styles.title}>{business.name}</h1>
        </div>
        <span className={styles.statusBadge}>{STATUS_LABEL[business.status ?? "draft"]}</span>
      </div>

      <SubscriptionStatusCard subscription={subscription} access={access} variant="compact" />

      <div className={styles.actions}>
        <Button href="/business/dashboard/profile" variant="secondary">
          עריכת העסק
        </Button>
        <Button href="/business/dashboard/preview" variant="secondary">
          תצוגה מקדימה
        </Button>
        <Button href="/business/dashboard/subscription" variant="secondary">
          ניהול מנוי
        </Button>
        {canSubmitForReview && (
          <form action={submitForReviewAction}>
            <Button type="submit" variant="accent">
              הגשה לאישור פרסום
            </Button>
          </form>
        )}
      </div>

      {business.status === "pending-review" && (
        <p className={styles.notice}>העמוד הוגש לאישור ויפורסם לאחר בדיקה של צוות הפורטל.</p>
      )}
    </div>
  );
}
