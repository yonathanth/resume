"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiCvTemplate, listCvTemplates } from "@/lib/api";

// Gallery order for the backend's template categories.
export const TEMPLATE_CATEGORY_ORDER = ["Simple", "Professional", "Academic", "Two-column"];

/**
 * Photo templates are hidden from the app for now (not removed): nothing
 * lists or offers them, but a CV already using one still opens and renders.
 * Flip this to bring them back.
 */
export const SHOW_PHOTO_TEMPLATES = false;

const isListed = (template: ApiCvTemplate) => SHOW_PHOTO_TEMPLATES || !template.hasPhoto;
const listedOnly = (templates: ApiCvTemplate[]) => templates.filter(isListed);

// The backend's template registry — the only templates that exist are the
// ones it can render. Rarely changes, so it's fetched once per session.
// `includeHidden` also returns the hidden ones — for looking up the template
// a CV already uses, never for offering templates to pick from.
export function useCvTemplates({ includeHidden = false }: { includeHidden?: boolean } = {}) {
  return useQuery({
    queryKey: ["cv-templates"],
    queryFn: listCvTemplates,
    staleTime: Infinity,
    select: includeHidden ? undefined : listedOnly,
  });
}

/** Templates grouped by category, in gallery order (unknown categories last). */
export function groupTemplatesByCategory(templates: ApiCvTemplate[]): { category: string; templates: ApiCvTemplate[] }[] {
  const order = (category: string) => {
    const index = TEMPLATE_CATEGORY_ORDER.indexOf(category);
    return index === -1 ? TEMPLATE_CATEGORY_ORDER.length : index;
  };
  const categories = [...new Set(templates.map((t) => t.category))].sort((a, b) => order(a) - order(b));
  return categories.map((category) => ({ category, templates: templates.filter((t) => t.category === category) }));
}
