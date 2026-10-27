"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RESULT_STORIES } from "@/lib/social-proof";
import { MiniBefore } from "./StoryResumes";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";
import { Sheet } from "@/components/RealResultsSection";
import { Reveal } from "@/components/Reveal";

// --- The section: one person's before & after per screen ------------------------

const SHEET_FRAME = "rounded-lg border border-neutral-200/80 shadow-[0_1px_2px_rgba(15,17,21,0.05),0_10px_28px_-12px_rgba(15,17,21,0.18)]";

/** Below the before & after: more people's resumes, one person at a time — swipe, or use the arrows. */
export function ResultsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const count = RESULT_STORIES.length;
  // Opens on the middle story, so there's one to either side.
  const start = Math.floor((count - 1) / 2);
  const [active, setActive] = useState(start);

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: start * track.clientWidth, behavior: "instant" });
  }, [start]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const width = track.clientWidth;
      if (width) setActive(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width))));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [count]);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const i = Math.max(0, Math.min(count - 1, index));
      track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    },
    [count]
  );

  const arrow =
    "absolute top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-700 shadow-sm backdrop-blur transition-colors hover:border-neutral-300 hover:text-neutral-950 disabled:opacity-0 disabled:pointer-events-none cursor-pointer";

  return (
    <section id="stories" aria-roledescription="carousel" aria-label="Before and after resumes" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
          Real results.
          <br />
          <span className="text-neutral-400">Same experience, finally shown.</span>
        </h2>
      </Reveal>

      {/* The arrows sit just outside the pair of resumes. */}
      <div className="relative mx-auto mt-10 max-w-3xl sm:mt-14">
        <button type="button" aria-label="Previous" className={`${arrow} -left-1 sm:-left-16`} onClick={() => goTo(active - 1)} disabled={active === 0}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Next" className={`${arrow} -right-1 sm:-right-16`} onClick={() => goTo(active + 1)} disabled={active === count - 1}>
          <ChevronRight className="h-5 w-5" />
        </button>

        <div ref={trackRef} className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none">
          {RESULT_STORIES.map((story, i) => (
            <div
              key={story.name}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${story.name}`}
              className="w-full shrink-0 snap-center px-1"
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-8">
                <figure>
                  <figcaption className="mb-4 flex justify-center">
                    <span className="rounded-full bg-neutral-100 px-4 py-1.5 text-[13.5px] font-medium text-neutral-500">Before</span>
                  </figcaption>
                  <Sheet className={SHEET_FRAME}>
                    <MiniBefore story={story} />
                  </Sheet>
                </figure>
                <figure>
                  <figcaption className="mb-4 flex justify-center">
                    <span className="rounded-full bg-neutral-950 px-4 py-1.5 text-[13.5px] font-medium text-white">After</span>
                  </figcaption>
                  <TemplateThumbnail
                    templateId={story.after.template}
                    story={story.after.key}
                    title={`${story.name}'s resume after GoMoxie`}
                    className={`aspect-[210/297] ${SHEET_FRAME}`}
                  />
                </figure>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-2">
        {RESULT_STORIES.map((story, i) => (
          <button
            key={story.name}
            type="button"
            aria-label={`Show ${story.name}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all cursor-pointer ${i === active ? "w-6 bg-neutral-950" : "w-2 bg-neutral-300 hover:bg-neutral-400"}`}
          />
        ))}
      </div>
    </section>
  );
}
