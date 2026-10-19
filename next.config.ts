import type { NextConfig } from "next";

// The signed-in app and the admin never belong in search results, even if a
// link to them gets out (robots.txt keeps crawlers from fetching them; this
// covers a page that's reached anyway).
const NO_INDEX_PATHS = ["/dashboard/:path*", "/admin/:path*", "/auth/:path*", "/payment/:path*", "/dev/:path*"];

// Hosted (Vercel + the API on Render): BACKEND_URL is the API's address, and
// the browser reaches it through this site at /api/v1 — so the sign-in cookie
// is first-party (browsers block third-party ones) and nothing needs CORS.
// Locally it's unset and the browser calls the API directly.
const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return BACKEND_URL ? [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }] : [];
  },
  async headers() {
    return NO_INDEX_PATHS.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }));
  },
  async redirects() {
    return [
      {
        source: "/get-started",
        destination: "/signup",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
