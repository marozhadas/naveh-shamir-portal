import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { BusinessProfileSkeleton } from "@/components/business-profile/BusinessProfileSkeleton/BusinessProfileSkeleton";
import styles from "./business-not-found.module.css";

export default function BusinessPageLoading() {
  return (
    <>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <div className={styles.container}>
          <BusinessProfileSkeleton />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
