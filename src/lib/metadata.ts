import type { Metadata } from "next";
import { SITE } from "@/lib/site";

// A public page's metadata: title, description, its own canonical URL, and
// the same words on the share card (Open Graph and X). Child pages don't
// inherit the root's canonical or share text, so every public page goes
// through this. The share image itself comes from the nearest
// opengraph-image file.

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  /** The page's path, e.g. "/pricing" — its canonical URL. */
  path: string;
  /** Use the title as is, without " – GoMoxie" after it. */
  absoluteTitle?: boolean;
}): Metadata {
  const shareTitle = absoluteTitle ? title : `${title} – ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE.name, locale: SITE.locale, url: path, title: shareTitle, description },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}

/** For pages that shouldn't be in search results (sign-in, account and token pages). */
export const NO_INDEX: Metadata["robots"] = { index: false, follow: false };
