import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import styles from "../legal-page.module.css";

export const metadata: Metadata = { title: "מדיניות פרטיות | נווה שמיר" };

export default function PrivacyPage() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>מדיניות פרטיות</h1>
          <p className={styles.updated}>עודכן לאחרונה: 2026</p>

          <div className={styles.prose}>
            <p>מדיניות זו מסבירה אילו פרטים פורטל נווה שמיר אוסף, ולאילו מטרות.</p>

            <h2>איזה מידע נאסף</h2>
            <ul>
              <li>פרטים שנמסרים דרך טופס הרשמת עסק: שם העסק, קטגוריה, תיאור, פרטי איש/אשת קשר, טלפון, וואטסאפ, אימייל וכתובת.</li>
              <li>מידע טכני בסיסי הנאסף אוטומטית על ידי שירותי האחסון (כגון כתובת IP ולוגים), לצורך תפעול ואבטחת האתר.</li>
            </ul>

            <h2>כיצד נעשה שימוש במידע</h2>
            <p>
              פרטי עסק שנמסרו דרך טופס ההרשמה נשמרים לצורך בדיקה ואישור על ידי צוות הפורטל. לאחר אישור, חלק מהפרטים
              (כגון שם העסק, תיאור ודרכי יצירת קשר) מוצגים באופן ציבורי בארכיון העסקים באתר.
            </p>

            <h2>שמירת מידע</h2>
            <p>המידע נשמר במסד נתונים מאובטח (Supabase), ואינו נמכר או מועבר לצדדים שלישיים למטרות שיווק.</p>

            <h2>יצירת קשר</h2>
            <p>לשאלות בנוגע למדיניות זו, או לבקשת הסרת מידע, ניתן לפנות לצוות הפורטל דרך פרטי הקשר בתחתית האתר.</p>

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
