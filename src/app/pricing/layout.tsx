import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

// The pricing page is a client component (checkout buttons), so its metadata lives here.
export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Your first AI CV is free. Plus from $3.99 a week, Pro with unlimited AI resumes from $6.99 a week, or pay per CV. Cancel anytime.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
