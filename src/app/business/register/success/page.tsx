import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import styles from "./success.module.css";

export const metadata: Metadata = { title: "ההרשמה התקבלה | נווה שמיר", robots: { index: false, follow: false } };

const PLAN_NAME: Record<string, string> = { plus: "Plus", premium: "Premium", free: "חינמי" };

type SuccessPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function RegisterSuccessPage({ searchParams }: SuccessPageProps) {
  const { plan } = await searchParams;
  const planName = plan ? (PLAN_NAME[plan] ?? plan) : null;

  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>ההרשמה התקבלה בהצלחה</h1>
          <p className={styles.description}>קיבלנו את פרטי העסק שלכם. הצוות שלנו יעבור על ההרשמה ויעדכן אתכם לאחר הבדיקה.</p>
          {planName && <p className={styles.planLine}>מסלול: {planName}</p>}
          <p className={styles.disclaimer}>חודש הניסיון עדיין לא התחיל. הוא יופעל רק לאחר אישור העסק והפעלה מפורשת.</p>
          <div className={styles.actions}>
            <Button href="/" variant="secondary">
              חזרה לעמוד הבית
            </Button>
            <Button href="/business/plans" variant="secondary">
              צפייה בחבילות
            </Button>
          </div>
          <p className={styles.smallPrint}>
            שאלות? אפשר לחזור אל <Link href="/business/plans">עמוד החבילות</Link> בכל שלב.
          </p>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
