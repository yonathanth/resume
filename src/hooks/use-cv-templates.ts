"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiCvTemplate, listCvTemplates } from "@/lib/api";

// Gallery order for the backend's template categories.
export const TEMPLATE_CATEGORY_ORDER = ["Simple", "Professional", "Academic", "Two-column"];

// The backend's template registry — the only templates that exist are the
// ones it can render. Rarely changes, so it's fetched once per session.
export function useCvTemplates() {
  return useQuery({
    queryKey: ["cv-templates"],
    queryFn: listCvTemplates,
    staleTime: Infinity,
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
