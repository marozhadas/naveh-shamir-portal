import Link from "next/link";
import type { LiveReadinessReport } from "@/lib/admin/live-readiness";
import styles from "./revenue.module.css";

type LiveReadinessNoticeProps = {
  report: LiveReadinessReport;
  /** PAYME_ENV today: "live" means these businesses are blocked from approval right now. */
  paymeEnv: "sandbox" | "live" | null;
};

const PLAN_LABEL = { plus: "Plus", premium: "Premium" } as const;

/** Admin-only. Shows how many pending paid businesses have no saved card - names and links only, nothing about any card. */
export function LiveReadinessNotice({ report, paymeEnv }: LiveReadinessNoticeProps) {
  if (!report.checked) {
    return (
      <div className={styles.banner} role="status">
        <strong>מוכנות למעבר ל-Live:</strong> לא ניתן היה לבדוק כרגע את ההרשמות הממתינות.
      </div>
    );
  }

  if (report.ready) {
    return (
      <div className={styles.banner} role="status">
        <strong>מוכנות למעבר ל-Live:</strong> אין הרשמות ישנות בתשלום (Plus / Premium) שממתינות בלי אמצעי תשלום שמור. מבחינת הרשמות ישנות, המערכת מוכנה למעבר ל-Live.
      </div>
    );
  }

  return (
    <div className={styles.banner} role="alert">
      <strong>
        {paymeEnv === "live" ? "אזהרה: " : "לא להעביר ל-Live עדיין: "}
        {report.issueCount} {report.issueCount === 1 ? "עסק בתשלום ממתין" : "עסקים בתשלום ממתינים"} בלי אמצעי תשלום שמור.
      </strong>{" "}
      {paymeEnv === "live"
        ? "הסליקה כבר Live, ולכן אי אפשר לאשר את העסקים האלה."
        : "כשהסליקה תהיה Live לא ניתן יהיה לאשר אותם, כי האישור יוצר את המנוי מהכרטיס שנשמר בשלב 6 בהרשמה."}{" "}
      לפני המעבר יש לטפל בהם (לדחות, או לטפל בהם בדרך אחרת). הרשימה לקריאה בלבד ואין בה שום פרט תשלום:
      <ul>
        {report.issues.map((issue) => (
          <li key={issue.id}>
            <Link href={`/admin/businesses/${issue.id}`}>{issue.businessName}</Link> ({PLAN_LABEL[issue.planTier]})
          </li>
        ))}
      </ul>
    </div>
  );
}
