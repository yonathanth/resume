import type { ApiCvTemplate } from "@/lib/api";
import { API_URL, PUBLIC_API_URL } from "@/lib/site";

// The template list for server-rendered pages (the public template pages,
// the sitemap, share images). Same source as the app's gallery; photo
// templates stay hidden there, so they stay out of here too.

const REVALIDATE_SECONDS = 60 * 60;

export async function fetchPublicTemplates(): Promise<ApiCvTemplate[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/templates`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: ApiCvTemplate[] };
    return (body.data ?? []).filter((t) => !t.hasPhoto);
  } catch {
    // Backend unreachable (e.g. at build time): pages render on request instead.
    return [];
  }
}

export async function fetchPublicTemplate(id: string): Promise<ApiCvTemplate | null> {
  return (await fetchPublicTemplates()).find((t) => t.id === id) ?? null;
}

/** The template's sample CV as a PNG (first page), rendered by the backend — for <img> on the page. */
export function templatePreviewUrl(id: string): string {
  return `${PUBLIC_API_URL}/api/v1/templates/${encodeURIComponent(id)}/preview.png`;
}

/** The same picture, fetched by this server (share images). */
export function templatePreviewFetchUrl(id: string): string {
  return `${API_URL}/api/v1/templates/${encodeURIComponent(id)}/preview.png`;
}

/** Who each category suits — the template pages' "Best for" line. */
export const CATEGORY_COPY: Record<string, { bestFor: string; blurb: string }> = {
  Simple: {
    bestFor: "Almost any job, especially your first few roles",
    blurb: "A clean single column that puts your experience first and reads cleanly in applicant tracking systems.",
  },
  Professional: {
    bestFor: "Experienced professionals and managers",
    blurb: "A polished layout with clear sections and a confident headline, made for a longer track record.",
  },
  Academic: {
    bestFor: "Researchers, lecturers and graduate applications",
    blurb: "Room for publications, research, teaching and grants, in the order academic readers expect.",
  },
  "Two-column": {
    bestFor: "Roles where skills and tools matter at a glance",
    blurb: "Skills, languages and contact details in a sidebar, so your experience gets the main column.",
  },
};
