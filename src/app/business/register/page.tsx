import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { RegisterBusinessForm } from "./RegisterBusinessForm";
import styles from "./register.module.css";

export const metadata: Metadata = { title: "רישום עסק | נווה שמיר", robots: { index: false, follow: false } };

export default function BusinessRegisterPage() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <h1 className={styles.title}>רישום עסק לפורטל</h1>
          <p className={styles.description}>
            הפרטים יישלחו לבדיקה של צוות הפורטל — לאחר אישור, העסק שלכם יופיע בארכיון העסקים ויהיה גלוי לכל תושבי
            השכונה.
          </p>
          <RegisterBusinessForm />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
