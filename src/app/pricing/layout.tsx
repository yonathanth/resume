import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { formatPrice } from "@/lib/plans";
import { fetchPricing } from "@/lib/pricing-server";

// The pricing page is a client component (checkout buttons), so its metadata
// lives here, with prices from the live price list.
export async function generateMetadata(): Promise<Metadata> {
  const pricing = await fetchPricing();
  const free = pricing.free.generations === 1 ? "Your first AI CV is free" : `Your first ${pricing.free.generations} AI CVs are free`;
  return pageMetadata({
    title: "Pricing",
    description: `${free}. Plus from ${formatPrice(pricing.plans.plus.weekly.price)} a week, Pro with unlimited AI CVs from ${formatPrice(pricing.plans.pro.weekly.price)} a week, or pay per CV. Cancel anytime.`,
    path: "/pricing",
  });
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
