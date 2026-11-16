import { OG_CONTENT_TYPE, OG_SIZE, ogCard, templatePicture } from "@/lib/og/card";
import { PAGE_CARDS } from "@/lib/og/pages";
import { TEMPLATE_NAMES } from "@/lib/og/template-names.generated";
import { fetchPublicTemplate, templatePreviewFetchUrl } from "@/lib/templates-server";

// A template page's share image: the real template (its sample CV) with Moxie
// beside it. Its picture and name are static in the frontend (see
// templatePicture), so the card doesn't wait on the backend; a template
// added since they were rendered falls back to the backend's.
export const alt = "A free, ATS-friendly resume template from gomoxie";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

async function backendPreview(id: string): Promise<string | null> {
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
  const name = TEMPLATE_NAMES[id] ?? (await fetchPublicTemplate(id))?.name;
  if (!name) return ogCard(PAGE_CARDS.templates);
  return ogCard({
    lines: [name, "resume template."],
    accent: name,
    pose: "pencil",
    templateImage: (await templatePicture(id)) ?? (await backendPreview(id)),
  });
}
