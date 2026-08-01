import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import styles from "../legal-page.module.css";

export const metadata: Metadata = { title: "הצהרת נגישות | נווה שמיר" };

export default function AccessibilityPage() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>הצהרת נגישות</h1>
          <p className={styles.updated}>עודכן לאחרונה: 2026</p>

          <div className={styles.prose}>
            <p>
              פורטל נווה שמיר שואף לעמוד בהנחיות הנגישות הבינלאומיות WCAG 2.2 ברמה AA, על מנת לאפשר לכלל תושבי
              השכונה — כולל אנשים עם מוגבלות — להשתמש באתר בצורה נוחה ועצמאית.
            </p>

            <h2>מה נעשה</h2>
            <ul>
              <li>תמיכה מלאה בכיוון כתיבה מימין לשמאל (RTL) בעברית.</li>
              <li>ניווט מלא באמצעות מקלדת, כולל focus states ברורים.</li>
              <li>טקסט חלופי לתמונות, ותוויות נגישות לכל שדה טופס ואייקון.</li>
              <li>ניגודיות צבעים נבדקת מול רקע, והתראה כאשר ניגודיות אינה מספקת.</li>
              <li>מבנה כותרות סמנטי וסדר קריאה הגיוני עבור קוראי מסך.</li>
            </ul>

            <h2>בעיות נגישות</h2>
            <p>
              אנו ממשיכים לשפר את נגישות האתר. אם נתקלתם בבעיית נגישות, נשמח שתדווחו לנו דרך פרטי הקשר בתחתית
              האתר, ונטפל בכך בהקדם האפשרי.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
