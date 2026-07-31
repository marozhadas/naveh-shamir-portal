import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import styles from "./business-not-found.module.css";

export default function BusinessNotFound() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <div className={styles.wrap}>
            <SearchX size={40} strokeWidth={1.5} aria-hidden="true" className={styles.icon} />
            <h1 className={styles.title}>העסק לא נמצא</h1>
            <p className={styles.description}>ייתכן שהקישור שגוי או שהעסק הוסר מהפורטל.</p>
            <Button href="/businesses" variant="secondary">
              חזרה לכל העסקים
            </Button>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
