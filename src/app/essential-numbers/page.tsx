import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { PageComingSoon } from "@/components/shared/PageComingSoon/PageComingSoon";
import styles from "./essential-numbers.module.css";

const PAGE_TITLE = "מספרים חיוניים לתושבי נווה שמיר | הפורטל של השכונה";
const PAGE_DESCRIPTION = "כל המספרים החשובים לשגרה ולמצבי חירום, במקום אחד.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/essential-numbers" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

export default function EssentialNumbersPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "מספרים חיוניים" }]} title="מספרים חיוניים" description={PAGE_DESCRIPTION} />
        <div className={styles.container}>
          {/* No placeholder/invented phone numbers per explicit requirement — real content lands once supplied. */}
          <PageComingSoon
            title="עדיין אין כאן מספרים"
            description="הרשימה עדיין לא מולאה במספרים אמיתיים. ברגע שיתקבל תוכן מאומת (חירום, עירייה, בריאות, חינוך, תחבורה ושירותים קהילתיים) הוא יופיע כאן."
          />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
