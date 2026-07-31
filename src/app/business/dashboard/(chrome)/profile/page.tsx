import type { Metadata } from "next";
import { ProfileEditForm } from "./ProfileEditForm";
import { resolveDashboardViewer } from "../../resolve-dashboard-viewer";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "עריכת העסק | דשבורד | נווה שמיר", robots: { index: false, follow: false } };

export default async function BusinessProfileEditPage() {
  const view = await resolveDashboardViewer();

  if (view.kind !== "ready") {
    return <p className={styles.notice}>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לערוך את העמוד.</p>;
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>עריכת העסק</h1>
      <p className={styles.description}>עדכנו את פרטי העסק שיוצגו בעמוד הציבורי. השינויים נשמרים מיד עם השליחה.</p>
      <ProfileEditForm business={view.business} />
    </div>
  );
}
