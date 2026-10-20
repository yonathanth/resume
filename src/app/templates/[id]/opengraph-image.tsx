import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { PAGE_CARDS } from "@/lib/og/pages";
import { fetchPublicTemplate, templatePreviewFetchUrl } from "@/lib/templates-server";

// A template page's share image: the real template (its sample CV, rendered
// by the backend) with Moxie beside it.
export const alt = "A free, ATS-friendly resume template from gomoxie";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

async function previewDataUri(id: string): Promise<string | null> {
  try {
    const res = await fetch(templatePreviewFetchUrl(id), { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await fetchPublicTemplate(id);
  if (!template) return ogCard(PAGE_CARDS.templates);
  return ogCard({
    eyebrow: `${template.category} template`,
    title: `${template.name} resume template`,
    subtitle: "Free, ATS-friendly, ready in minutes.",
    pose: "pencil",
    templateImage: await previewDataUri(id),
  });
}
