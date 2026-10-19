import React from "react";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CtaButton } from "@/components/CtaButton";
import { Reveal } from "@/components/Reveal";
import { TemplatesGallery } from "@/components/TemplatesGallery";

export const metadata: Metadata = pageMetadata({
  title: "Free resume templates",
  description:
    "Free, recruiter-tested resume templates that read cleanly in applicant tracking systems — simple one-pagers, professional layouts, two-column designs and academic CVs.",
  path: "/templates",
});

export default function TemplatesPage() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[#fdfdfd] font-sans text-neutral-900 selection:bg-accent selection:text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />

      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-36 sm:px-6 sm:pt-40 lg:px-8">
        {/* Header */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-950 sm:text-6xl sm:leading-[1.05]">
            Resume <span className="text-accent">templates.</span>
          </h1>
        </Reveal>

        <div className="mt-10 sm:mt-12">
          <TemplatesGallery />
        </div>

        {/* Closing CTA */}
        <Reveal className="mx-auto mt-24 max-w-2xl text-center sm:mt-28">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">Found one you like?</h2>
          <p className="mt-4 text-base text-neutral-500 sm:text-lg">Switch templates anytime. Your content stays.</p>
          <div className="mt-8 flex justify-center">
            <CtaButton href="/signup">Build my resume</CtaButton>
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
