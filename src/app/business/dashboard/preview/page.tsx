import type { Metadata } from "next";
import { BusinessProfilePage } from "@/components/business-profile/BusinessProfilePage/BusinessProfilePage";
import { businessRepository } from "@/repositories/mock-business-repository";
import { resolveDashboardViewer } from "../resolve-dashboard-viewer";

export const metadata: Metadata = { title: "תצוגה מקדימה | דשבורד | נווה שמיר", robots: { index: false, follow: false } };

export default async function BusinessPreviewPage() {
  const view = await resolveDashboardViewer();

  if (view.kind !== "ready") {
    return <p>יש להיכנס במצב הדגמה כבעל/ת עסק כדי לצפות בתצוגה המקדימה.</p>;
  }

  const relatedBusinesses = await businessRepository.getRelated(view.business, 4);

  return (
    <BusinessProfilePage business={view.business} relatedBusinesses={relatedBusinesses} viewer={view.viewer} isPreview />
  );
}
