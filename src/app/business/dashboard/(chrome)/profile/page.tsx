import type { Metadata } from "next";
import { ProfileEditForm } from "./ProfileEditForm";
import { resolveDashboardViewer } from "../../resolve-dashboard-viewer";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "עריכת העסק | דשבורד | נווה שמיר", robots: { index: false, follow: false } };

function formatJerusalemDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export default async function BusinessProfileEditPage() {
  const view = await resolveDashboardViewer();

  if (view.kind !== "ready") {
    return <p className={styles.notice}>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לערוך את העמוד.</p>;
  }

  if (!view.selfEditAccess.eligible && view.selfEditAccess.reason === "plan-not-eligible") {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>עריכת העסק</h1>
        <p className={styles.notice}>עדכון עצמאי של פרטי העסק זמין למנויי Plus ו-Premium בלבד. אפשר לשדרג את החבילה מעמוד המנוי.</p>
      </div>
    );
  }

  if (!view.selfEditAccess.eligible && view.selfEditAccess.reason === "already-edited-this-month") {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>עריכת העסק</h1>
        <p className={styles.notice}>
          כבר השתמשת באפשרות העריכה שלך לחודש הזה. ניתן יהיה לערוך שוב בחודש הבא.
          {view.selfEditAccess.nextEligibleAt && (
            <>
              <br />
              העריכה הבאה תהיה זמינה החל מ-{formatJerusalemDate(view.selfEditAccess.nextEligibleAt)}.
            </>
          )}
        </p>
      </div>
    );
  }

  if (!view.selfEditAccess.eligible) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>עריכת העסק</h1>
        <p className={styles.notice}>עריכה עצמית אינה זמינה כרגע — המנוי אינו פעיל. אפשר לבדוק את סטטוס המנוי בעמוד &quot;המנוי שלי&quot;.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>עריכת העסק</h1>
      <p className={styles.description}>עדכנו את פרטי העסק שיוצגו בעמוד הציבורי. השינויים נשמרים מיד עם השליחה.</p>
      {view.business.activePlanId === "plus" && <p className={styles.notice}>לתשומת לבכם: בחבילת Plus ניתן לשמור עריכה אחת בכל חודש קלנדרי.</p>}
      <ProfileEditForm business={view.business} />
    </div>
  );
}
