import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { FAQ_GROUPS } from "@/lib/help-content";
import { pageMetadata } from "@/lib/metadata";

// The help page is a client component (search), so its metadata — and its
// FAQ as structured data — live here.
export const metadata: Metadata = pageMetadata({
  title: "Help center",
  description: "Answers about building, tailoring and downloading your CV, templates, career profiles, plans and your account.",
  path: "/help",
});

const FAQ_PAGE = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_GROUPS.flatMap((group) =>
    group.faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } }))
  ),
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={FAQ_PAGE} />
      {children}
    </>
  );
}
