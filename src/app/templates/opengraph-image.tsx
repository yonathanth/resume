import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { PAGE_CARDS } from "@/lib/og/pages";

// This page's share image (see lib/og).
export const alt = PAGE_CARDS.templates.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard(PAGE_CARDS.templates);
}
