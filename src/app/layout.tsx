import type { Metadata } from "next";
import { ploni } from "@/styles/fonts";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={ploni.variable}>
      <body>{children}</body>
    </html>
  );
}
