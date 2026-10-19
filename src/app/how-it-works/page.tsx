import React from "react";
import { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CtaButton } from "@/components/CtaButton";
import { Reveal } from "@/components/Reveal";
import { EditorVisual, JobVisual, SourceVisual } from "@/components/HowItWorks";

export const metadata: Metadata = pageMetadata({
  title: "How it works",
  description:
    "From your story to a finished CV: share your details, let AI write it, tailor it to the job, then download a polished PDF.",
  path: "/how-it-works",
});

// The full version of the home page's How it works section — same three
// steps and animations, each with room for a fuller explanation
// (see CreateCvModal and TailorCvModal for the flows behind it).

const STEPS: { title: string; lead: string; Visual: React.ComponentType }[] = [
  {
    title: "Share your details",
    lead: "Start from whatever you already have. The AI sorts it into a resume and only asks about what's missing.",
    Visual: SourceVisual,
  },
  {
    title: "Tailor it to the job",
    lead: "Paste the job post, or just the job title. Your resume is rewritten around what that role asks for, using only what's true about you.",
    Visual: JobVisual,
  },
  {
    title: "Download and apply",
    lead: "Your resume opens in the editor so you can check it over before it goes anywhere.",
    Visual: EditorVisual,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[#fdfdfd] font-sans text-neutral-900 selection:bg-accent selection:text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />

      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-36 sm:px-6 sm:pt-40 lg:px-8">
        {/* Header */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-950 sm:text-6xl sm:leading-[1.05]">
            How it <span className="text-accent">works.</span>
          </h1>
          <p className="mt-5 text-base text-neutral-500 sm:text-lg">Three steps from what you have to a resume you can send.</p>
        </Reveal>

        {/* Steps */}
        <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-24">
          {STEPS.map(({ title, lead, Visual }, i) => (
            <div
              key={title}
              className={`grid grid-cols-1 items-center gap-8 lg:gap-14 ${i % 2 === 1 ? "lg:grid-cols-[3fr_2fr]" : "lg:grid-cols-[2fr_3fr]"}`}
            >
              {/* Centred on phones and tablets; from lg it sits beside its visual, left-aligned. */}
              <Reveal className={`text-center lg:text-left ${i % 2 === 1 ? "lg:order-2 lg:pl-4" : "lg:pr-4"}`}>
                <div className="flex items-center justify-center gap-3 lg:justify-start">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-[15px] font-semibold text-accent-strong">
                    {i + 1}
                  </span>
                  <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-neutral-400">Step {i + 1}</span>
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">{title}</h2>
                <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-neutral-500 sm:text-lg lg:mx-0">{lead}</p>
              </Reveal>

              <Reveal delay={120} className={i % 2 === 1 ? "lg:order-1" : ""}>
                <div className="rounded-3xl border border-neutral-200 bg-white p-2.5 shadow-[0_12px_32px_-20px_rgba(15,17,21,0.22)]">
                  <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-[18px] border border-neutral-100 bg-neutral-50 sm:h-[340px]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative sm:scale-125">
                      <Visual />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>

        {/* Closing CTA */}
        <Reveal className="mx-auto mt-28 max-w-2xl text-center sm:mt-36">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">Ready when you are.</h2>
          <p className="mt-4 text-base text-neutral-500 sm:text-lg">Start with 3 free AI generations. No card needed.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaButton href="/signup">Build my resume</CtaButton>
            <Link
              href="/pricing"
              className="px-4 py-2 text-[15px] font-medium text-neutral-600 transition-colors hover:text-neutral-950"
            >
              See pricing
            </Link>
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
