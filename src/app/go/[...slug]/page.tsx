import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseQuickIntent, type QuickIntent } from "@/lib/quick-links";
import { PAGE_CARDS } from "@/lib/og/pages";
import { SITE } from "@/lib/site";
import { fetchPublicTemplate } from "@/lib/templates-server";
import { QuickLinkRedirect } from "./QuickLinkRedirect";

/** The public page a quick link stands for: its share card is the one this link shows. */
async function shareTarget(intent: QuickIntent): Promise<{ path: string; title: string; description: string }> {
  switch (intent.kind) {
    case "create":
    case "tailor":
    case "improve": {
      const card = PAGE_CARDS[intent.kind];
      return { path: `/try/${intent.kind}`, title: card.title, description: card.subtitle };
    }
    case "template": {
      const template = await fetchPublicTemplate(intent.templateId);
      return template
        ? {
            path: `/templates/${template.id}`,
            title: `Free ${template.name} resume template`,
            description: `${template.description} Free to use, ATS-friendly, download as PDF.`,
          }
        : { path: "/templates", title: PAGE_CARDS.templates.title, description: PAGE_CARDS.templates.subtitle };
    }
    case "pro":
      return { path: "/pricing", title: PAGE_CARDS.pricing.title, description: PAGE_CARDS.pricing.subtitle };
  }
}

// A shared /go link previews exactly like the page it leads to (same title and
// share image), while staying out of search results itself: the canonical
// points at that page.
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const intent = parseQuickIntent(slug);
  if (!intent) return {};
  const target = await shareTarget(intent);
  const shareTitle = `${target.title} – ${SITE.name}`;
  const image = `${target.path}/opengraph-image`;
  return {
    title: target.title,
    description: target.description,
    alternates: { canonical: target.path },
    robots: { index: false, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      url: target.path,
      title: shareTitle,
      description: target.description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: shareTitle, description: target.description, images: [image] },
  };
}

/**
 * Quick links for sharing and ads — /go/create, /go/tailor, /go/improve,
 * /go/template/<id>, /go/pro. Remembers what the visitor came for, then sends
 * them into the app (or to sign up first); the dashboard opens it from there.
 */
export default async function QuickLinkPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const intent = parseQuickIntent(slug);
  if (!intent) notFound();
  return <QuickLinkRedirect intent={intent} />;
}
