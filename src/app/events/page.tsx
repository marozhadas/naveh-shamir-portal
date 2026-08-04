import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings, defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { EventsArchive } from "@/components/events/EventsArchive/EventsArchive";
import { EventsGridSkeleton } from "@/components/events/EventsGridSkeleton/EventsGridSkeleton";
import { getPublishedEvents } from "@/repositories/community-events-service";
import styles from "./events.module.css";

const PAGE_TITLE = "מה קורה בנווה שמיר? | הפורטל של השכונה";
const PAGE_DESCRIPTION = "כל האירועים, הפעילויות והמפגשים במקום אחד.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/events" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, locale: "he_IL", type: "website" },
};

// Reads live, admin-published events from Supabase on every request.
export const dynamic = "force-dynamic";

async function EventsArchiveLoader() {
  const events = await getPublishedEvents();
  return <EventsArchive events={events} />;
}

export default function EventsPage() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <Header settings={defaultHeaderSettings} />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "אירועים" }]} title="מה קורה בנווה שמיר?" description={PAGE_DESCRIPTION} />
        <div className={styles.container}>
          <Suspense fallback={<EventsGridSkeleton />}>
            <EventsArchiveLoader />
          </Suspense>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
