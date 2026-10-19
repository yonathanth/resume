import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

// The pricing page is a client component (checkout buttons), so its metadata lives here.
export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Start free with one use of every tool — create, tailor and improve. Go Pro for unlimited AI resumes from $4.99 a week. Cancel anytime.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
