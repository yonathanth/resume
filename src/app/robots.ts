import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Crawl the public pages; keep the app, the admin and account/token pages out.
// /go links stay crawlable on purpose: link-preview bots (X's among them)
// respect robots.txt, and those pages say noindex themselves.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/auth/",
          "/payment/",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
          "/unsubscribe",
          "/dev/",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
