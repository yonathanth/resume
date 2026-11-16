"use client";

import React from "react";
import { HeroBeforeAfter } from "@/components/RealResultsSection";
import { CtaButton } from "@/components/CtaButton";

/**
 * The landing page's first screen, a full screen tall: the promise on the
 * left, and beside it the proof — the same CV
 * before and after, whole. Moxie's quick start (upload a CV, or build one
 * from scratch) peeks in from the screen's edge — see MoxiePeek. On phones it
 * stacks.
 */
export function Hero() {
  return (
    <>
      <section className="relative mx-auto grid min-h-svh w-full max-w-page grid-cols-1 content-center items-center gap-12 px-4 pb-12 pt-32 sm:gap-14 sm:px-6 sm:pt-36 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14 lg:px-8 lg:pb-12">
        {/* The promise. A container, so the headline sizes to the column. */}
        <div className="@container flex flex-col items-start text-left">
          {/* Always two lines: each line never wraps, and the size follows the column's width (capped). */}
          <h1 className="hero-rise [animation-delay:120ms] w-full text-[length:min(9.6cqi,84px)] font-semibold leading-[1.05] tracking-[-0.035em] text-neutral-950">
            <span className="block whitespace-nowrap">Build a CV that&apos;s</span>
            <span className="block whitespace-nowrap">
              {/* The accent word: slanted, in the brand orange, with a hand-drawn underline that draws in. */}
              <span className="relative inline-block pr-[0.06em] italic text-accent">
                impossible
                <svg
                  className="pointer-events-none absolute -bottom-[0.08em] left-0 h-[0.2em] w-full overflow-visible text-accent-light"
                  viewBox="0 0 200 14"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path className="hero-underline" pathLength={1} d="M3 10 C 45 4, 110 2, 197 7" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>{" "}
              to ignore.
            </span>
          </h1>

          <p className="hero-rise [animation-delay:220ms] mt-5 max-w-md text-[15px] leading-snug text-neutral-500 sm:text-[17px] sm:leading-[1.45]">
            Start from scratch, improve the one you have, or tailor it to a job post. We write it around real results and show you what to fix.
          </p>

          <div id="hero-cta" className="hero-rise [animation-delay:280ms] mt-8">
            <CtaButton href="/signup" size="hero" shine="subtle">
              Try for free
            </CtaButton>
          </div>
        </div>

        {/* What they get: the same CV before and after */}
        <div className="w-full">
          <HeroBeforeAfter full />
        </div>
      </section>
    </>
  );
}
