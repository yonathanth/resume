import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { faqGroups } from "@/lib/help-content";
import { pageMetadata } from "@/lib/metadata";
import { fetchPricing } from "@/lib/pricing-server";

// The help page is a client component (search), so its metadata — and its
// FAQ as structured data — live here.
export const metadata: Metadata = pageMetadata({
  title: "Help center",
  description: "Answers about creating, improving, tailoring and downloading your CV, templates, career profiles, plans and your account.",
  path: "/help",
});

export default async function HelpLayout({ children }: { children: React.ReactNode }) {
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups(await fetchPricing()).flatMap((group) =>
      group.faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } }))
    ),
  };
  return (
    <>
      <JsonLd data={faqPage} />
      {children}
    </>
  );
}
