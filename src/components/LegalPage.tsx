import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackLink } from "@/components/BackLink";

export interface LegalSection {
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}

/** Shared layout for the Terms of Service and Privacy Policy pages. */
export function LegalPage({ title, updated, intro, sections }: LegalPageProps) {
  return (
    <div className="relative min-h-screen bg-[#fdfdfd] font-sans text-neutral-900">
      <Navbar />

      {/* Floats below the navbar so it's always within reach while reading */}
      <BackLink className="fixed left-4 top-24 z-40 sm:left-6 sm:top-28" />

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-36 sm:px-6 sm:pt-40">
        <p className="text-[13px] font-medium text-neutral-400">Last updated {updated}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl">{title}</h1>
        <div className="mt-6 text-[16px] leading-relaxed text-neutral-600">{intro}</div>

        {/* Contents */}
        <nav aria-label="Contents" className="mt-10 rounded-2xl border border-neutral-200/80 bg-white p-6">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Contents</p>
          <ol className="grid gap-x-8 gap-y-2 text-[14.5px] sm:grid-cols-2">
            {sections.map((section, i) => (
              <li key={section.title}>
                <a href={`#section-${i + 1}`} className="text-neutral-600 transition-colors hover:text-accent-strong">
                  <span className="mr-2 text-neutral-400">{i + 1}.</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-14 space-y-12">
          {sections.map((section, i) => (
            <section key={section.title} id={`section-${i + 1}`} className="scroll-mt-28">
              <h2 className="text-[21px] font-semibold tracking-tight text-neutral-950">
                <span className="mr-2 text-accent">{i + 1}.</span>
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-[15.5px] leading-relaxed text-neutral-600 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-neutral-200/80 pt-8">
          <p className="text-[14.5px] text-neutral-500">
            Questions about this page? Reach us through the{" "}
            <Link href="/help" className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:text-accent-strong">
              Help center
            </Link>
            .
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
