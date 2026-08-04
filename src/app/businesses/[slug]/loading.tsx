import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BusinessProfileSkeleton } from "@/components/business-profile/BusinessProfileSkeleton/BusinessProfileSkeleton";
import styles from "./business-not-found.module.css";

export default function BusinessPageLoading() {
  return (
    <>
      <ConnectedHeader />
      <main id="main-content">
        <div className={styles.container}>
          <BusinessProfileSkeleton />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
