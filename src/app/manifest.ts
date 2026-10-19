import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Lets phones add GoMoxie to the home screen with its own name, icon and colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} – ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fdfdfd",
    theme_color: SITE.accent,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
