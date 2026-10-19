import type { Metadata } from "next";
import { HomePage } from "@/components/HomePage";
import { pageMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site";

// The landing page. Its content is a client component (it sends signed-in
// visitors to their dashboard); the metadata lives here.
export const metadata: Metadata = pageMetadata({
  title: `${SITE.name} – ${SITE.tagline}`,
  description: SITE.description,
  path: "/",
  absoluteTitle: true,
});

export default function Home() {
  return <HomePage />;
}
