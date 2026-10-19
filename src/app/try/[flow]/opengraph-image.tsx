import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { PAGE_CARDS } from "@/lib/og/pages";

// Each /try flow's share image — the links to promote on social and in ads.
export const alt = "Build, tailor or improve your CV with GoMoxie — start free, no account needed";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const CARDS = { create: PAGE_CARDS.create, tailor: PAGE_CARDS.tailor, improve: PAGE_CARDS.improve };

export default async function Image({ params }: { params: Promise<{ flow: string }> }) {
  const { flow } = await params;
  return ogCard(CARDS[flow as keyof typeof CARDS] ?? PAGE_CARDS.home);
}
