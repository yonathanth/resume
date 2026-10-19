import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/lib/query-client";
import { SmoothScroll } from "@/components/SmoothScroll";
import { FirstTouchCapture } from "@/components/FirstTouchCapture";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/site";
import { ORGANIZATION, SOFTWARE_APPLICATION, WEBSITE } from "@/lib/structured-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} – ${SITE.tagline}`, template: `%s – ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["resume builder", "AI resume", "CV maker", "tailor resume to job", "ATS resume", "resume templates"],
  // Shared defaults only — no canonical URL here, or every page would claim
  // to be the home page. Public pages set their own canonical and share text
  // through pageMetadata() (lib/metadata.ts).
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    title: `${SITE.name} – ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} – ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#fdfdfd] text-neutral-900">
        <Providers>{children}</Providers>
        {/* Eased wheel scrolling — public pages only (see SmoothScroll). */}
        <SmoothScroll />
        <FirstTouchCapture />
        <JsonLd data={[ORGANIZATION, WEBSITE, SOFTWARE_APPLICATION]} />
      </body>
    </html>
  );
}
