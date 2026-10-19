"use client";

import React from "react";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";
import { Reveal } from "@/components/Reveal";
import { CtaButton } from "@/components/CtaButton";

// Side by side: the copy on the left; on the right, a wall of real templates
// laid out on a tilted plane — three columns drifting in opposite directions,
// fading out at the edges — that pauses while the pointer is over it (and
// stands still for reduced motion). On phones the wall sits under the copy.
// (The sign-in pages have a flat wall of their own; this one is tilted.)

/** Templates per column, before it repeats for the seamless loop. */
const PER_COLUMN = 4;
/** Each column's direction and how long one loop takes — slow, and never in step. */
const COLUMNS = [
  { direction: "up", seconds: 70 },
  { direction: "down", seconds: 82 },
  { direction: "up", seconds: 76 },
] as const;

export function TemplatesSection() {
  const { data: templates } = useCvTemplates();
  const reducedMotion = usePrefersReducedMotion();
  const ids = (templates ?? []).map((t) => t.id);

  // Each column starts further along the list, so neighbours never line up the same template.
  const columnIds = (col: number) =>
    ids.length ? Array.from({ length: PER_COLUMN }, (_, i) => ids[(col * 2 + i * COLUMNS.length) % ids.length]) : [];

  return (
    <section id="templates" className="relative overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        {/* Copy */}
        <Reveal className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
            Built to pass the scan.
            <br />
            <span className="text-neutral-400">Designed to impress.</span>
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-500">
            Recruiter-tested templates that read cleanly in any applicant tracking system.
          </p>
          <div className="mt-8">
            <CtaButton href="/templates" plainArrow>
              Browse templates
            </CtaButton>
          </div>
        </Reveal>

        {/* The tilted wall */}
        <Reveal delay={150}>
          <div
            className="group relative h-[380px] overflow-hidden sm:h-[460px] lg:h-[560px] [perspective:1600px]"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 14%, black 86%, transparent), linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 14%, black 86%, transparent), linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
            aria-hidden="true"
          >
            <div className="absolute -inset-x-[18%] -inset-y-[30%] grid grid-cols-3 gap-4 [transform:rotateX(24deg)_rotateZ(-14deg)] sm:gap-5">
              {COLUMNS.map((column, col) => {
                const items = columnIds(col);
                return (
                  <div key={col} className="overflow-visible">
                    <div
                      className="flex flex-col gap-4 group-hover:[animation-play-state:paused] sm:gap-5"
                      // Set part by part (not the shorthand), so the class above can still pause it on hover.
                      style={
                        reducedMotion
                          ? undefined
                          : {
                              animationName: `marquee-${column.direction}`,
                              animationDuration: `${column.seconds}s`,
                              animationTimingFunction: "linear",
                              animationIterationCount: "infinite",
                              willChange: "transform",
                            }
                      }
                    >
                      {/* Twice over, so the loop (which moves half its height) never shows a gap. */}
                      {(items.length ? [...items, ...items] : Array.from({ length: PER_COLUMN * 2 }, () => "")).map((id, i) =>
                        id ? (
                          <TemplateThumbnail
                            key={i}
                            templateId={id}
                            className="aspect-[210/297] w-full shrink-0 rounded-xl border border-neutral-200/80 shadow-[0_1px_2px_rgba(15,17,21,0.05),0_12px_24px_-14px_rgba(15,17,21,0.25)]"
                          />
                        ) : (
                          <div key={i} className="aspect-[210/297] w-full shrink-0 animate-pulse rounded-xl bg-neutral-100" />
                        ),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
