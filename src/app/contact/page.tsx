import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { PageComingSoon } from "@/components/shared/PageComingSoon/PageComingSoon";
import styles from "./contact.module.css";

const PAGE_TITLE = "צור קשר עם פורטל נווה שמיר | הפורטל של השכונה";
const PAGE_DESCRIPTION = "יש לכם רעיון, תיקון, שאלה או הצעה לפורטל? נשמח לשמוע.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

export default function ContactPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "צור קשר" }]} title="צור קשר" description={PAGE_DESCRIPTION} />
        <div className={styles.container}>
          <PageComingSoon title="הטופס בבנייה" description="בקרוב תוכלו לשלוח פנייה ישירות דרך העמוד הזה." />
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
