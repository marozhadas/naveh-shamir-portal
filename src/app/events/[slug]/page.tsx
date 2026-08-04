import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Phone, MapPin, Ticket, CalendarDays } from "lucide-react";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { getEventBySlug } from "@/repositories/community-events-service";
import { EVENT_AUDIENCE_LABEL } from "@/types/community-event";
import { formatEventDateFull, formatEventTimeRange, formatEventWeekday } from "@/utils/format-event-date";
import { createWhatsappLink } from "@/utils/create-whatsapp-link";
import { createEventJsonLd } from "@/utils/create-event-json-ld";
import { getSiteOrigin } from "@/utils/site-origin";
import { AddToCalendarButton } from "./AddToCalendarButton";
import styles from "./event-detail.module.css";

type EventPageProps = { params: Promise<{ slug: string }> };

/**
 * Next.js's dynamic route params are supposed to already be URL-decoded, but for a non-ASCII
 * (e.g. Hebrew) slug this build inconsistently hands the page component the still-percent-encoded
 * string — see the identical fix in businesses/[slug] and marketplace/[slug].
 */
function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Escapes `<` so a value containing "</script>" can never break out of the JSON-LD script tag. */
function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function whatsappHref(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return createWhatsappLink(`https://wa.me/${digits}`);
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const event = await getEventBySlug(slug);
  if (!event) return { title: "האירוע לא נמצא | אירועים בנווה שמיר", robots: { index: false, follow: false } };

  const title = `${event.title} | אירועים בנווה שמיר`;
  const description = event.short_description.slice(0, 160);
  const url = `${getSiteOrigin()}/events/${event.slug}`;

  if (event.status !== "published") {
    // Canceled/archived events still resolve for anyone with the direct link, but shouldn't be indexed or shared as live listings.
    return { title, description, robots: { index: false, follow: false } };
  }

  return {
    title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: event.title,
      description,
      url,
      images: event.image_url ? [{ url: event.image_url }] : undefined,
      locale: "he_IL",
      type: "website",
    },
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const pageUrl = `${getSiteOrigin()}/events/${event.slug}`;
  const whatsappUrl = event.whatsapp ? whatsappHref(event.whatsapp) : "";
  const priceLabel = event.is_free ? "הכניסה חופשית" : event.price_text || "בתשלום";
  const jsonLd = createEventJsonLd(event);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON-LD structured data, not HTML — see serializeJsonLd for the </script>-breakout guard.
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <ConnectedHeader />
      <main id="main-content">
        <PageHeader breadcrumbs={[{ label: "בית", href: "/" }, { label: "אירועים", href: "/events" }, { label: event.title }]} title={event.title} description={event.short_description} />

        <div className={styles.container}>
          <div className={styles.layout}>
            <div>
              {event.image_url ? (
                <div className={styles.imageWrap}>
                  <Image src={event.image_url} alt={event.image_alt ?? event.title} fill sizes="(max-width: 768px) 100vw, 480px" className={styles.image} />
                </div>
              ) : (
                <div className={styles.imagePlaceholder} aria-hidden="true">
                  <CalendarDays size={48} strokeWidth={1.5} />
                </div>
              )}
            </div>

            <div className={styles.details}>
              {event.status === "canceled" && <p className={styles.canceledBanner}>האירוע בוטל</p>}

              <p className={styles.dateLine}>
                <CalendarDays size={18} aria-hidden="true" />
                {formatEventWeekday(event.event_date)}, {formatEventDateFull(event.event_date)} · {formatEventTimeRange(event.start_time, event.end_time)}
              </p>

              {event.audience.length > 0 && (
                <div className={styles.tags}>
                  {event.audience.map((a) => (
                    <span key={a} className={styles.tag}>
                      {EVENT_AUDIENCE_LABEL[a]}
                    </span>
                  ))}
                </div>
              )}

              <p className={styles.description}>{event.full_description}</p>

              <ul className={styles.metaList}>
                <li className={styles.metaItem}>
                  <MapPin size={16} aria-hidden="true" />
                  {event.address ? `${event.location_name}, ${event.address}` : event.location_name}
                </li>
              </ul>

              <p className={styles.price}>{priceLabel}</p>

              {event.status !== "canceled" && (
                <div className={styles.actions}>
                  {event.registration_url && (
                    <Button href={event.registration_url} target="_blank" rel="noopener noreferrer" icon={<Ticket size={16} aria-hidden="true" />}>
                      הרשמה לאירוע
                    </Button>
                  )}
                  {event.contact_phone && (
                    <Button href={`tel:${event.contact_phone}`} variant="secondary" icon={<Phone size={16} aria-hidden="true" />}>
                      התקשרו
                    </Button>
                  )}
                  {whatsappUrl && (
                    <Button href={whatsappUrl} variant="whatsapp" target="_blank" rel="noopener noreferrer" icon={<WhatsAppIcon size={16} aria-hidden="true" />}>
                      וואטסאפ
                    </Button>
                  )}
                  <AddToCalendarButton event={event} pageUrl={pageUrl} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer settings={defaultFooterSettings} />
    </>
  );
}
