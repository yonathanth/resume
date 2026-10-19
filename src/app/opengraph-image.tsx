import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { PAGE_CARDS } from "@/lib/og/pages";

// The site-wide share image: the home page, and any page without its own (see lib/og).
export const alt = PAGE_CARDS.home.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard(PAGE_CARDS.home);
}
