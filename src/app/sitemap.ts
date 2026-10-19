import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { fetchPublicTemplates } from "@/lib/templates-server";

// Every page worth finding in search: the marketing pages, the /try flows
// (start without an account) and one page per template.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: siteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  });
  const templates = await fetchPublicTemplates();
  return [
    page("/", 1, "weekly"),
    page("/try/create", 0.9),
    page("/try/tailor", 0.9),
    page("/try/improve", 0.9),
    page("/templates", 0.9, "weekly"),
    ...templates.map((t) => page(`/templates/${t.id}`, 0.8)),
    page("/pricing", 0.8),
    page("/how-it-works", 0.7),
    page("/help", 0.6),
    page("/signup", 0.6),
    page("/login", 0.3, "yearly"),
    page("/privacy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
