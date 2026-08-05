import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { EssentialNumbersArchive } from "@/components/essential-numbers/EssentialNumbersArchive/EssentialNumbersArchive";
import { EssentialNumbersGridSkeleton } from "@/components/essential-numbers/EssentialNumbersGridSkeleton/EssentialNumbersGridSkeleton";
import { WhatsAppGroupsSection } from "@/components/whatsapp-groups/WhatsAppGroupsSection/WhatsAppGroupsSection";
import { WhatsAppGroupsGridSkeleton } from "@/components/whatsapp-groups/WhatsAppGroupsGridSkeleton/WhatsAppGroupsGridSkeleton";
import { getPublishedEssentialNumbers } from "@/repositories/essential-numbers-service";
import { getPublishedWhatsAppGroups } from "@/repositories/whatsapp-groups-service";
import styles from "./essential-numbers.module.css";

const PAGE_TITLE = "מספרים חיוניים | הפורטל של השכונה";
const PAGE_DESCRIPTION = "כל מספרי הטלפון החשובים של נווה שמיר במקום אחד.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/essential-numbers" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

// Reads live, admin-published numbers from Supabase on every request.
export const dynamic = "force-dynamic";

async function EssentialNumbersArchiveLoader() {
  const entries = await getPublishedEssentialNumbers();
  return <EssentialNumbersArchive entries={entries} />;
}

async function WhatsAppGroupsLoader() {
  const groups = await getPublishedWhatsAppGroups();
  return <WhatsAppGroupsSection groups={groups} />;
}

export default function EssentialNumbersPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "מספרים חיוניים" }]} title="מספרים חיוניים" description={PAGE_DESCRIPTION} />
        <p className={styles.supportText}>לחצו על מספר הטלפון כדי לבצע שיחה.</p>
        <div className={styles.container}>
          <Suspense fallback={<EssentialNumbersGridSkeleton />}>
            <EssentialNumbersArchiveLoader />
          </Suspense>
        </div>

        <div className={styles.sectionDivider} aria-hidden="true" />

        <section id="whatsapp-groups" className={styles.whatsappGroupsSection} aria-labelledby="whatsapp-groups-heading">
          <div className={styles.container}>
            <h2 id="whatsapp-groups-heading" className={styles.whatsappGroupsTitle}>
              קבוצות WhatsApp של נווה שמיר
            </h2>
            <p className={styles.whatsappGroupsDescription}>כל קבוצות ה־WhatsApp השכונתיות במקום אחד — לפי נושא, קהל ותחום עניין.</p>
            <p className={styles.supportText}>לחצו על הקבוצה המתאימה כדי לעבור ל־WhatsApp ולבקש להצטרף.</p>

            <Suspense fallback={<WhatsAppGroupsGridSkeleton />}>
              <WhatsAppGroupsLoader />
            </Suspense>

            <p className={styles.disclaimer}>
              הקבוצות מנוהלות על ידי מנהלים עצמאיים. פורטל נווה שמיר מרכז את הקישורים בלבד ואינו אחראי לתוכן המתפרסם בקבוצות. לפני הצטרפות לקבוצה מומלץ לעבור על תיאור הקבוצה והכללים שלה.
            </p>
          </div>
        </section>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
