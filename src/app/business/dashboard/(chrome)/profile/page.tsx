import type { Metadata } from "next";
import { ProfileEditForm } from "./ProfileEditForm";
import { BusinessContentEditor } from "@/components/business-dashboard/BusinessContentEditor/BusinessContentEditor";
import { getOwnedRegistrationRow } from "@/repositories/business-management-service";
import { mapRegistrationToManagementValues } from "@/app/business/manage/[token]/map-registration-to-management-values";
import { discardOwnerBusinessMediaAction, saveOwnerBusinessContentAction, uploadOwnerBusinessMediaAction } from "../../owner-content-actions";
import { isSupabaseBusinessId, toRegistrationId } from "@/utils/business-id";
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

  const alreadyEdited = !view.selfEditAccess.eligible && view.selfEditAccess.reason === "already-edited-this-month";

  // Real (Supabase-backed) businesses get the full owner editor; the in-memory demo businesses
  // keep the basic text form below, since they have no Storage folder or persisted rich content.
  //
  // The editor is rendered in the SAME tree position whether or not the monthly edit is already
  // used (then read-only, with the reason shown): a successful Plus save re-renders this page
  // server-side, and swapping the editor for a plain notice at that moment would unmount it and
  // wipe the save confirmation the owner has just been shown.
  const registrationRow =
    (view.selfEditAccess.eligible || alreadyEdited) && isSupabaseBusinessId(view.business.id)
      ? await getOwnedRegistrationRow(toRegistrationId(view.business.id), view.viewer.id)
      : null;

  if (registrationRow) {
    const lockedReason =
      !view.selfEditAccess.eligible && view.selfEditAccess.reason === "already-edited-this-month"
        ? `כבר השתמשת באפשרות העריכה שלך לחודש הזה. ניתן לצפות בפרטי העסק, אך לא לשמור שינויים עד החודש הבא${
            view.selfEditAccess.nextEligibleAt ? ` — העריכה הבאה תהיה זמינה החל מ-${formatJerusalemDate(view.selfEditAccess.nextEligibleAt)}` : ""
          }.`
        : undefined;

    return (
      <div className={styles.wideWrap}>
        <h1 className={styles.title}>עריכת העסק</h1>
        <p className={styles.description}>עדכנו את פרטי העסק שיוצגו בעמוד הציבורי. הכניסה לעמוד והצפייה בתצוגה המקדימה אינן נחשבות עריכה — רק שמירה בפועל.</p>
        {view.business.activePlanId === "plus" && (
          <p className={styles.notice}>לתשומת לבכם: בחבילת Plus ניתן לשמור עריכה אחת בכל חודש קלנדרי. כדאי לעדכן את כל הפרטים ואז לשמור פעם אחת.</p>
        )}
        <BusinessContentEditor
          initialValues={mapRegistrationToManagementValues(registrationRow)}
          saveAction={saveOwnerBusinessContentAction}
          uploadAction={uploadOwnerBusinessMediaAction}
          removeMediaAction={discardOwnerBusinessMediaAction}
          previewHref="/business/dashboard/preview"
          previewLabel="תצוגה מקדימה של העמוד"
          previewHint="מציגה את מה שנשמר. שינויים שטרם נשמרו לא מופיעים בה."
          disabledReason={lockedReason}
        />
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
