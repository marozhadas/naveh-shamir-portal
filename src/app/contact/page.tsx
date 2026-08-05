import type { Metadata } from "next";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { ContactMethodCards } from "@/components/contact/ContactMethodCards/ContactMethodCards";
import { ContactForm } from "./ContactForm";
import styles from "./contact.module.css";

const PAGE_TITLE = "צור קשר | פורטל נווה שמיר";
const PAGE_DESCRIPTION = "יצירת קשר עם פורטל נווה שמיר באמצעות WhatsApp, מייל או טופס פנייה.";

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
        <PageHeader
          breadcrumbs={[{ label: "בית", href: "/" }, { label: "צור קשר" }]}
          title="צרו איתנו קשר"
          description="יש לכם שאלה, עדכון או בקשה? אפשר לפנות אלינו ב־WhatsApp, במייל או דרך הטופס."
        />
        <p className={styles.supportText}>הפניות מתקבלות ב־WhatsApp ובמייל בלבד.</p>
        <div className={styles.container}>
          <div className={styles.cardsColumn}>
            <ContactMethodCards />
          </div>
          <div className={styles.formColumn}>
            <ContactForm />
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
