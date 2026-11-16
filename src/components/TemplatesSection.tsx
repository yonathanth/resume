"use client";

import React from "react";
import Image from "next/image";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Reveal } from "@/components/Reveal";
import { CtaButton } from "@/components/CtaButton";

// Side by side: the copy on the left; on the right, a wall of real templates,
// dark and light neighbours contrasting, laid out on a tilted plane — three columns drifting in opposite directions, fading out at
// the edges — that pauses while the pointer is over it (and stands still for
// reduced motion). On phones the wall sits under the copy.
// (The sign-in pages have a flat wall of their own; this one is tilted.)

/** Each column's direction and how long one loop takes — slow, and never in step. */
const COLUMNS = [
  { direction: "up", seconds: 70 },
  { direction: "down", seconds: 82 },
  { direction: "up", seconds: 76 },
] as const;
/**
 * The templates on the wall, dark and colorful next to light, in this order.
 * Each is a static picture of its first page in public/landing-templates/
 * (rendered from the backend's sample CV), so the wall shows at once without
 * waiting on the backend. Changed a template's look, or adding one here? Re-render
 * its picture too (476×674 WebP, the template's sample CV in thumbnail mode).
 */
const WALL_TEMPLATES = ["midnight", "classic", "spark", "linen", "minimal", "clarity", "formal", "banner", "focus", "stack", "prose", "research"];
/** Templates per column, before it repeats for the seamless loop. */
const PER_COLUMN = 4;

// Down each column the templates follow the order above; each column starts further along it.
const columnIds = (col: number) => Array.from({ length: PER_COLUMN }, (_, i) => WALL_TEMPLATES[(col + i * COLUMNS.length) % WALL_TEMPLATES.length]);

export function TemplatesSection() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section id="templates" className="relative overflow-hidden py-10 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-page grid-cols-1 px-4 sm:px-6 lg:px-8 items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        {/* Copy */}
        <Reveal className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
            Templates built to
            <br />
            <span className="text-accent">pass the scan.</span>
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-neutral-500">
            Recruiter-tested templates that read cleanly in any applicant tracking system.
          </p>
          <div className="mt-8">
            <CtaButton href="/templates" plainArrow shine="subtle">
              Browse templates
            </CtaButton>
          </div>
        </Reveal>

        {/* The tilted wall */}
        <Reveal delay={150}>
          <div
            className="group relative h-[320px] overflow-hidden sm:h-[400px] lg:h-[460px] [perspective:1600px]"
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
                      {[...items, ...items].map((id, i) => (
                        <Image
                          key={i}
                          src={`/landing-templates/${id}.webp`}
                          alt=""
                          width={476}
                          height={674}
                          unoptimized
                          className="aspect-[210/297] w-full shrink-0 rounded-2xl border border-neutral-200/80 bg-white object-cover object-top shadow-[0_1px_2px_rgba(15,17,21,0.05),0_12px_24px_-14px_rgba(15,17,21,0.25)]"
                        />
                      ))}
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
