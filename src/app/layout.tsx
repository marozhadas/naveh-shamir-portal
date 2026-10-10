import type { Metadata } from "next";
import { ploni } from "@/styles/fonts";
import { EditorHost } from "@/editor/EditorHost";
import { AnalyticsClickTracker } from "@/components/analytics/AnalyticsClickTracker";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getPublishedPageContent } from "@/repositories/site-content-service";
import { getHeaderViewerDisplay } from "@/lib/header-viewer";
import { BASE_OPEN_GRAPH, SITE_DESCRIPTION, SITE_METADATA_BASE, SITE_TITLE } from "@/lib/seo/site-metadata";
import "./globals.css";

export const metadata: Metadata = {
  // Every relative canonical / Open Graph URL resolves against the OFFICIAL domain (SITE_CONFIG.siteUrl), never the request host.
  metadataBase: SITE_METADATA_BASE,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    ...BASE_OPEN_GRAPH,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAdmin, publishedContent, headerViewer] = await Promise.all([
    isAdminAuthenticated(),
    getPublishedPageContent("home"),
    getHeaderViewerDisplay(),
  ]);

  return (
    <html lang="he" dir="rtl" className={ploni.variable}>
      <body>
        <AnalyticsClickTracker />
        <FeedbackWidget />
        <EditorHost isAdmin={isAdmin} publishedContent={publishedContent} headerViewer={headerViewer}>
          {children}
        </EditorHost>
      </body>
    </html>
  );
}
