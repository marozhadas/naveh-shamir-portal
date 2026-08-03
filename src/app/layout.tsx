import type { Metadata } from "next";
import { ploni } from "@/styles/fonts";
import { EditorHost } from "@/editor/EditorHost";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getPublishedPageContent } from "@/repositories/site-content-service";
import "./globals.css";

const SITE_TITLE = "נווה שמיר — הפורטל של השכונה";
const SITE_DESCRIPTION =
  "כל המידע המקומי של נווה שמיר במקום אחד: עסקים, אירועים, לוחות קהילה, גמ״חים ומידע שימושי לתושבי השכונה.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "he_IL",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAdmin, publishedContent] = await Promise.all([isAdminAuthenticated(), getPublishedPageContent("home")]);

  return (
    <html lang="he" dir="rtl" className={ploni.variable}>
      <body>
        <EditorHost isAdmin={isAdmin} publishedContent={publishedContent}>
          {children}
        </EditorHost>
      </body>
    </html>
  );
}
