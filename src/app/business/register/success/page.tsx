import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import styles from "./success.module.css";

const PLAN_NAME: Record<string, string> = { plus: "Plus", premium: "Premium", free: "חינמי" };

type SuccessPageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export async function generateMetadata({ searchParams }: SuccessPageProps): Promise<Metadata> {
  const { plan } = await searchParams;
  return {
    title: plan === "premium" ? "ההרשמה לחבילת Premium התקבלה | נווה שמיר" : "ההרשמה התקבלה | נווה שמיר",
    robots: { index: false, follow: false },
  };
}

export default async function RegisterSuccessPage({ searchParams }: SuccessPageProps) {
  const { plan } = await searchParams;
  const planName = plan ? (PLAN_NAME[plan] ?? plan) : null;
  const isPremium = plan === "premium";

  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>{isPremium ? "ההרשמה לחבילת Premium התקבלה" : "ההרשמה התקבלה בהצלחה"}</h1>
          <p className={styles.description}>
            {isPremium
              ? "קיבלנו את פרטי העסק שלכם. לאחר בדיקה ואישור נעדכן אתכם בהמשך תהליך הפעלת החבילה."
              : "קיבלנו את פרטי העסק שלכם. הצוות שלנו יעבור על ההרשמה ויעדכן אתכם לאחר הבדיקה."}
          </p>
          {planName && !isPremium && <p className={styles.planLine}>מסלול: {planName}</p>}
          <p className={styles.disclaimer}>
            {isPremium
              ? "הגישה לאזור האישי תישלח רק לאחר אישור העסק והפעלת חבילת Premium."
              : "חודש הניסיון עדיין לא התחיל. הוא יופעל רק לאחר אישור העסק והפעלה מפורשת."}
          </p>
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
