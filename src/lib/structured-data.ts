import { SITE, siteUrl } from "@/lib/site";

// schema.org descriptions of the product, for search results.

export const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": siteUrl("/#organization"),
  name: SITE.name,
  url: SITE.url,
  logo: siteUrl("/icon.svg"),
};

export const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": siteUrl("/#website"),
  name: SITE.name,
  url: SITE.url,
  publisher: { "@id": siteUrl("/#organization") },
};

// Prices as on the pricing page (Polar plans in USD).
export const SOFTWARE_APPLICATION = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  url: SITE.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE.description,
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro — weekly", price: "4.99", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro — monthly", price: "9.99", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro — 3 months", price: "24.99", priceCurrency: "USD" },
  ],
  publisher: { "@id": siteUrl("/#organization") },
};

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: siteUrl(item.path) })),
  };
}
