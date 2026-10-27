"use client";

import React from "react";
import { Star } from "lucide-react";
import { HeroStart } from "@/components/landing/HeroStart";
import { HeroBeforeAfter } from "@/components/RealResultsSection";
import { BrandIcon } from "@/components/landing/BrandIcon";
import { CtaButton } from "@/components/CtaButton";
import { HERO_RATING } from "@/lib/social-proof";

/**
 * The landing page's first screen, built to get a visitor started: the
 * rating and the promise on the left, the first step (upload a CV, or build
 * one from scratch) on the right. Under it, what they get: the same CV before
 * and after, side by side. On phones it all stacks in that order.
 */
export function Hero() {
  return (
    <>
      <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-36 sm:gap-14 sm:px-8 sm:pt-40 lg:min-h-[86svh] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-20 lg:px-10 lg:pb-16">
        {/* The rating and the promise */}
        <div className="flex flex-col items-start text-left">
          {/* The rating, and where it's from (Trustpilot's own green squares and mark) */}
          <a
            href={HERO_RATING.href}
            target={HERO_RATING.href ? "_blank" : undefined}
            rel="noreferrer"
            className="hero-rise flex items-center gap-2.5 text-[14px] text-neutral-600"
          >
            <span className="flex items-center gap-[3px]" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="flex h-[18px] w-[18px] items-center justify-center bg-[#00b67a]">
                  <Star className="h-3 w-3 text-white" fill="currentColor" strokeWidth={0} />
                </span>
              ))}
            </span>
            <span>
              <strong className="font-semibold text-neutral-900">{HERO_RATING.score}</strong> on
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-neutral-900">
              <BrandIcon icon={HERO_RATING.icon} className="h-4 w-4" />
              {HERO_RATING.platform}
            </span>
          </a>

          <h1 className="hero-rise [animation-delay:120ms] mt-6 text-4xl font-bold leading-[1.06] tracking-tight text-neutral-950 sm:text-6xl lg:text-[52px]">
            Your CV, rewritten for{" "}
            <span className="hero-shimmer bg-[linear-gradient(110deg,var(--accent-strong),var(--accent)_35%,var(--accent-light)_50%,var(--accent)_65%,var(--accent-strong))] bg-clip-text text-transparent">
              the job you want.
            </span>
          </h1>

          <p className="hero-rise [animation-delay:220ms] mt-5 max-w-md text-[15px] leading-snug text-neutral-500 sm:text-[17px] sm:leading-[1.45]">
            Upload your CV and get it rewritten around real results, ready to send. Your first CV is free, no card needed.
          </p>

          <div className="hero-rise [animation-delay:280ms] mt-8">
            <CtaButton href="/signup" size="hero" shine="subtle">
              Try for free
            </CtaButton>
          </div>
        </div>

        {/* The first step: upload a CV, or build one from scratch */}
        <div className="hero-rise [animation-delay:320ms] flex w-full justify-start lg:justify-end">
          <HeroStart />
        </div>
      </section>

      {/* What they get */}
      <section aria-label="What GoMoxie does to a CV" className="hero-rise [animation-delay:420ms] mx-auto w-full max-w-5xl px-5 pb-20 pt-6 sm:px-8 sm:pb-28 lg:px-10">
        <p className="mb-7 text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-400">What changes in your CV</p>
        <HeroBeforeAfter />
      </section>
    </>
  );
}
