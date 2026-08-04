import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { Footer } from "@/components/layout/Footer";
import { defaultFooterSettings } from "@/editor/config/editor-defaults";
import { BusinessProfilePage } from "@/components/business-profile/BusinessProfilePage/BusinessProfilePage";
import { BusinessUnavailableState } from "@/components/business-profile/BusinessUnavailableState/BusinessUnavailableState";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { getListingAccessByBusinessId } from "@/domain/get-business-listing-access";
import { getBusinessDescription, getBusinessHeroImage } from "@/utils/business-profile";
import { createLocalBusinessStructuredData } from "@/utils/create-local-business-json-ld";
import { trackAnalyticsEvent } from "@/repositories/analytics-service";
import { SITE_CONFIG } from "@/data/config";
import { resolveBusinessView } from "./resolve-business-view";

/** Escapes `<` so a value containing "</script>" can never break out of the JSON-LD script tag. */
function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

type BusinessPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BusinessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const view = await resolveBusinessView(slug);

  if (view.kind === "not-found" || view.kind === "unavailable") {
    return { title: "עסק לא נמצא | עסקים בנווה שמיר", robots: { index: false, follow: false } };
  }

  const { business } = view;
  const title = `${business.name} | עסקים בנווה שמיר`;
  const description = getBusinessDescription(business).slice(0, 160);
  const heroImage = getBusinessHeroImage(business);
  const url = `${SITE_CONFIG.siteUrl}/businesses/${business.slug}`;

  if (view.kind === "preview") {
    // Never index a draft/suspended business, and never let its slug become discoverable via search (spec section 42).
    return { title, description, robots: { index: false, follow: false } };
  }

  return {
    title,
    description,
    alternates: { canonical: `/businesses/${business.slug}` },
    openGraph: {
      title: business.name,
      description,
      url,
      images: heroImage.src ? [{ url: heroImage.src }] : undefined,
      locale: "he_IL",
      type: "website",
    },
  };
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { slug } = await params;
  const view = await resolveBusinessView(slug);

  if (view.kind === "not-found") {
    notFound();
  }

  if (view.kind === "unavailable") {
    return (
      <>
        <ConnectedHeader />
        <main id="main-content">
          <BusinessUnavailableState />
        </main>
        <Footer settings={defaultFooterSettings} />
      </>
    );
  }

  // Fire-and-forget — never blocks rendering the page. Only real published visits count, not
  // an owner's own preview of a draft/suspended listing.
  if (view.kind === "published") {
    void trackAnalyticsEvent("business_page_view", { businessId: view.business.id, category: view.business.category });
  }

  // Related businesses are only ever suggested if they're themselves premium (spec section 13) —
  // a non-clickable basic card inside "עסקים דומים" would look broken, and this component isn't
  // meant to render a non-clickable variant.
  const relatedCandidates = await businessRepository.getRelated(view.business, 8);
  const relatedAccessByBusinessId = await getListingAccessByBusinessId(relatedCandidates, subscriptionRepository, new Date());
  const relatedBusinesses = relatedCandidates.filter((business) => relatedAccessByBusinessId[business.id]?.canOpenProfile).slice(0, 4);

  return (
    <>
      {view.kind === "published" && (
        <script
          type="application/ld+json"
          // JSON-LD structured data, not HTML — see serializeJsonLd for the </script>-breakout guard.
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(createLocalBusinessStructuredData(view.business)) }}
        />
      )}
      <BusinessProfilePage
        business={view.business}
        access={view.access}
        relatedBusinesses={relatedBusinesses}
        relatedAccessByBusinessId={relatedAccessByBusinessId}
        viewer={view.viewer}
        isPreview={view.kind === "preview"}
      />
    </>
  );
}
