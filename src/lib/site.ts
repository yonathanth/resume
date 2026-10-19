// The product's name and address, in one place: page titles, share images,
// the sitemap and structured data all read them from here.

export const SITE = {
  name: "GoMoxie",
  /** Production origin, no trailing slash. NEXT_PUBLIC_SITE_URL overrides it (staging, previews). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gomoxie.app").replace(/\/$/, ""),
  tagline: "AI resumes that land interviews",
  description:
    "Create a resume, tailor it to any job posting, or improve the one you have — with AI, in minutes. ATS-friendly templates, PDF download, free to start.",
  locale: "en_US",
  /** The brand's accent (see --accent in globals.css). */
  accent: "#ff5e1f",
} as const;

/** An absolute URL on the site. */
export const siteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * The backend, for server-side fetches (template list, share images).
 * BACKEND_URL is the API's own address (e.g. https://gomoxie-api.onrender.com)
 * when the browser reaches it through this site's /api/v1 proxy.
 */
export const API_URL = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/**
 * The backend as the browser addresses it: "" (same origin, through the
 * /api/v1 proxy in next.config.ts) or the API's own address.
 */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
