import type { Metadata } from "next";
import { BusinessProfilePage } from "@/components/business-profile/BusinessProfilePage/BusinessProfilePage";
import { businessRepository } from "@/repositories/mock-business-repository";
import { subscriptionRepository } from "@/repositories/mock-subscription-repository";
import { getBusinessListingAccess, getListingAccessByBusinessId } from "@/domain/get-business-listing-access";
import { resolveDashboardViewer } from "../resolve-dashboard-viewer";

export const metadata: Metadata = { title: "תצוגה מקדימה | דשבורד | נווה שמיר", robots: { index: false, follow: false } };

export default async function BusinessPreviewPage() {
  const view = await resolveDashboardViewer();

  if (view.kind !== "ready") {
    return <p>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לצפות בתצוגה המקדימה.</p>;
  }

  const subscription = await subscriptionRepository.getByBusinessId(view.business.id);
  const access = getBusinessListingAccess(view.business, subscription, new Date());

  const relatedCandidates = await businessRepository.getRelated(view.business, 8);
  const relatedAccessByBusinessId = await getListingAccessByBusinessId(relatedCandidates, subscriptionRepository, new Date());
  const relatedBusinesses = relatedCandidates.filter((business) => relatedAccessByBusinessId[business.id]?.canOpenProfile).slice(0, 4);

  return (
    <BusinessProfilePage
      business={view.business}
      access={access}
      relatedBusinesses={relatedBusinesses}
      relatedAccessByBusinessId={relatedAccessByBusinessId}
      viewer={view.viewer}
      isPreview
    />
  );
}
