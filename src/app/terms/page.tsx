import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import styles from "../legal-page.module.css";

export const metadata: Metadata = { title: "תנאי שימוש | נווה שמיר" };

export default function TermsPage() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>תנאי שימוש</h1>
          <p className={styles.updated}>עודכן לאחרונה: 2026</p>

          <div className={styles.prose}>
            <p>
              פורטל נווה שמיר הוא לוח קהילתי המיועד לתושבי השכונה, ומציג מידע על עסקים, אירועים ושירותים מקומיים.
              השימוש באתר כפוף לתנאים הבאים.
            </p>

            <h2>שימוש באתר</h2>
            <p>
              השימוש בתוכן האתר מיועד לצרכים אישיים ולא מסחריים, בכפוף לחוק. אין להעתיק, לשכפל או להפיץ תוכן מהאתר
              ללא אישור מראש מבעלי הפורטל.
            </p>

            <h2>רישום עסקים</h2>
            <p>
              עסקים המבקשים להירשם לפורטל דרך טופס ההרשמה נדרשים למסור פרטים נכונים ומדויקים. הפורטל שומר לעצמו
              את הזכות לאשר, לדחות או להסיר רישום עסק, לפי שיקול דעתו.
            </p>

            <h2>אחריות</h2>
            <p>
              המידע המוצג באתר, לרבות פרטי עסקים ואירועים, מוצג כפי שהוא (&quot;as is&quot;). הפורטל אינו אחראי לדיוק, לעדכניות
              או לאמינות המידע שמסרו צדדים שלישיים (בעלי עסקים, מפרסמי אירועים ואחרים).
            </p>

            <p className={styles.notice}>
              זהו נוסח כללי לצורך הפעלת האתר בשלב זה, ואינו מהווה ייעוץ משפטי. מומלץ להחליפו בנוסח שנבדק על ידי עורך
              דין לפני שימוש מסחרי מלא.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
