"use client";

import React, { useEffect, useState } from "react";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";
import { CtaButton } from "@/components/CtaButton";


// How many real templates rotate through the hero fan, and how often.
const DECK_SIZE = 6;
const CYCLE_MS = 3200;

// Where a card sits relative to the active one: centre, either flank, or
// tucked out of sight behind the centre waiting for its turn.
function slotStyle(offset: number, size: number): { className: string; style: React.CSSProperties } {
  if (offset === 0) {
    return { className: "z-30 opacity-100", style: { transform: "translateX(0) rotate(0deg) scale(1)" } };
  }
  if (offset === 1) {
    return { className: "z-20 opacity-100", style: { transform: "translateX(64%) translateY(0) rotate(0deg) scale(0.84)" } };
  }
  if (offset === size - 1) {
    return { className: "z-20 opacity-100", style: { transform: "translateX(-64%) translateY(0) rotate(0deg) scale(0.84)" } };
  }
  return { className: "z-10 opacity-0", style: { transform: "translateX(0) translateY(24px) scale(0.7)" } };
}

export function Hero() {
  const { data: templates } = useCvTemplates();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const deck = (templates ?? []).slice(0, DECK_SIZE);
  const size = deck.length;

  useEffect(() => {
    if (size < 2 || paused) return;
    const interval = setInterval(() => setActive((prev) => (prev + 1) % size), CYCLE_MS);
    return () => clearInterval(interval);
  }, [size, paused]);

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pt-24 sm:pt-28 pb-10">
      {/* Template fan */}
      <div
        className="hero-rise relative -mb-10 sm:-mb-14 h-[162px] sm:h-[188px] w-[236px] sm:w-[304px] flex items-start justify-center"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Soft brand glow behind the stack */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[172px] sm:w-[370px] sm:h-[210px] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,46,0.22),rgba(255,155,96,0.08)_55%,transparent)] blur-2xl pointer-events-none hero-glow" />

        {/* The card stack */}
        <div className="absolute inset-0 flex items-start justify-center">
        {size === 0 &&
          [-1, 0, 1].map((pos) => (
            <div
              key={pos}
              className={`absolute top-0 w-[104px] sm:w-[124px] aspect-[210/297] rounded-lg bg-white border border-neutral-200 ${
                pos === 0 ? "z-30" : "z-20 opacity-70"
              }`}
              style={{
                transform: pos === 0 ? undefined : `translateX(${pos * 64}%) scale(0.84)`,
              }}
            >
              <div className="absolute inset-0 rounded-lg animate-pulse bg-neutral-100/80" />
            </div>
          ))}

        {deck.map((template, i) => {
          const offset = (i - active + size) % size;
          const { className, style } = slotStyle(offset, size);
          const isActive = offset === 0;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setActive(i)}
              tabIndex={offset === 0 || offset === 1 || offset === size - 1 ? 0 : -1}
              aria-label={`Show ${template.name} template`}
              className={`group/card absolute top-0 w-[104px] sm:w-[124px] cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${className}`}
              style={style}
            >
              <TemplateThumbnail
                templateId={template.id}
                title={`${template.name} template example`}
                className={`aspect-[210/297] rounded-lg border transition-shadow duration-700 ${
                  isActive
                    ? "border-neutral-200 shadow-[0_24px_48px_-16px_rgba(15,17,21,0.28),0_0_0_1px_rgba(255,94,31,0.08)]"
                    : "border-neutral-200/80 shadow-[0_12px_28px_-12px_rgba(15,17,21,0.18)]"
                }`}
              />
              {/* Dim the flanks so the centre card reads first */}
              <div
                className={`absolute inset-0 rounded-lg bg-white transition-opacity duration-700 pointer-events-none ${
                  isActive ? "opacity-0" : "opacity-25 group-hover/card:opacity-0"
                }`}
              />
            </button>
          );
        })}
        </div>

        {/* The headline slides over the cards' feet: a soft frosted fade melts them into the page */}
        <div className="absolute z-40 -inset-x-16 -bottom-2 h-14 sm:h-[72px] pointer-events-none bg-gradient-to-b from-transparent via-[#fdfdfd]/25 to-[#fdfdfd]/60 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent,black_70%)]" />
      </div>

      {/* Headline */}
      <h1 className="hero-rise [animation-delay:120ms] relative z-50 text-4xl sm:text-6xl md:text-7xl lg:text-[72px] font-bold tracking-tight text-neutral-950 max-w-4xl leading-[1.08] sm:leading-[1.04]">
        Craft resumes that <br className="hidden sm:inline" />
        land{" "}
        <span className="hero-shimmer bg-[linear-gradient(110deg,var(--accent-strong),var(--accent)_35%,var(--accent-light)_50%,var(--accent)_65%,var(--accent-strong))] bg-clip-text text-transparent">
          interviews.
        </span>
      </h1>

      {/* Sub-headline */}
      <p className="hero-rise [animation-delay:220ms] mt-5 text-lg sm:text-xl text-neutral-500 font-normal max-w-2xl mx-auto leading-relaxed">
        Featuring real-time ATS keyword matching, tailored bullet generation,
        and recruiter-tested modern templates, updated weekly.
      </p>

      {/* CTA Buttons */}
      <div className="hero-rise [animation-delay:320ms] mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
        <CtaButton href="/signup" className="w-full sm:w-auto">Get started free</CtaButton>
        <CtaButton href="/how-it-works" variant="secondary" className="w-full sm:w-auto">How it works</CtaButton>
      </div>
    </section>
  );
}
