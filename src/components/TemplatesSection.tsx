"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";
import { Reveal } from "@/components/Reveal";
import { CtaButton } from "@/components/CtaButton";

// A wall of real templates above the copy: five cards at staggered heights,
// threaded on dashed guide lines that run down behind the copy.
// Purely decorative — no hover or click; the button is the way in.

// How far (px) each card sits below the top of the wall.
const OFFSETS = [72, 16, 52, 8, 64];

// Cards whose guide line carries a short accent dash.
const ACCENT_LINES = new Set([0, 2, 4]);

export function TemplatesSection() {
  const { data: templates } = useCvTemplates();
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // Let the columns settle in once, the first time the section is on screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ids = (templates ?? []).map((t) => t.id);

  return (
    <section ref={sectionRef} id="templates" className="relative overflow-hidden px-4 pb-24 pt-10 sm:px-6 sm:pb-28 lg:px-8">
      <div className="relative mx-auto max-w-4xl">
        {/* Guide lines running down from each column, fading out under the copy */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex gap-2.5 [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_55%,transparent_95%)] sm:gap-3">
          {OFFSETS.map((_, i) => (
            <div key={i} className="relative flex flex-1 justify-center">
              <div className="h-full w-px bg-[linear-gradient(to_bottom,var(--accent-light)_55%,transparent_55%)] [background-size:1px_9px] opacity-60" />
              {ACCENT_LINES.has(i) && (
                <div className="absolute top-[62%] h-20 w-px bg-[linear-gradient(to_bottom,var(--accent)_55%,transparent_55%)] [background-size:1px_7px]" />
              )}
            </div>
          ))}
        </div>

        {/* The wall */}
        <div className="relative flex items-start gap-2.5 sm:gap-3">
          {OFFSETS.map((offset, i) => (
            <div
              key={i}
              className={`tpl-col min-w-0 flex-1 ${inView ? "tpl-col-in" : ""}`}
              style={{ marginTop: offset, transitionDelay: `${i * 60}ms` }}
            >
              {ids.length ? (
                <TemplateThumbnail
                  templateId={ids[i % ids.length]}
                  title="Resume template example"
                  className="aspect-[210/297] w-full rounded-xl border border-neutral-200/80 shadow-[0_1px_2px_rgba(15,17,21,0.05),0_6px_16px_-8px_rgba(15,17,21,0.08)]"
                />
              ) : (
                <div className="aspect-[210/297] w-full animate-pulse rounded-xl bg-neutral-100" />
              )}
            </div>
          ))}
        </div>

        {/* Copy */}
        <Reveal delay={250} className="relative z-10 mt-10 flex flex-col items-center text-center sm:mt-12">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
            Built to pass the scan.
            <br />
            <span className="text-neutral-400">Designed to impress.</span>
          </h2>
          <p className="mt-5 max-w-md text-base text-neutral-500 sm:text-lg">
            Every template is recruiter-tested and reads cleanly in applicant tracking systems — from simple one-pagers to academic CVs.
          </p>
          <div className="mt-8">
            <CtaButton href="/templates" plainArrow>
              Explore all templates
            </CtaButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
