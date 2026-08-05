import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { EssentialNumbersArchive } from "@/components/essential-numbers/EssentialNumbersArchive/EssentialNumbersArchive";
import { EssentialNumbersGridSkeleton } from "@/components/essential-numbers/EssentialNumbersGridSkeleton/EssentialNumbersGridSkeleton";
import { getPublishedEssentialNumbers } from "@/repositories/essential-numbers-service";
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
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
