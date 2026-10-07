"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface TourStep {
  /** `data-tour` value of the element to spotlight; the card is centered when it isn't on screen. */
  target: string;
  title: string;
  body: string;
  /** Runs when the step opens — e.g. to switch to the tab that holds the target. */
  onShow?: () => void;
}

/** The dashboard tour, started from the top bar's menu. */
const DASHBOARD_STEPS: TourStep[] = [
  {
    target: "builder",
    title: "The Builder",
    body: "Start here. Create a CV from scratch, a file, or a career profile, or tailor and improve one you already have.",
  },
  {
    target: "career-profiles",
    title: "Career Profiles",
    body: "One profile per role you're going for. Each remembers your skills and history, so new resumes start half-written.",
  },
  {
    target: "past-projects",
    title: "Past Projects",
    body: "Every resume you've made. Open one to edit it, duplicate it for a new application, or download the PDF.",
  },
  {
    target: "templates",
    title: "Templates",
    body: "Browse every layout with real example content. Switching templates later never loses anything you wrote.",
  },
  {
    target: "menu",
    title: "The menu",
    body: "Help, this tour, your account settings, and logging out all live here.",
  },
];

const PAD = 6;
const CARD_WIDTH = 320;
const CARD_HEIGHT = 230; // roughly; used only to keep the card on screen
const GAP = 16;

// Beside the target if there's room (right, then left), else below or above
// it, else over its bottom edge (for targets as big as the screen).
function placeCard(rect: DOMRect): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampLeft = (x: number) => Math.max(GAP, Math.min(x, vw - CARD_WIDTH - GAP));
  const clampTop = (y: number) => Math.max(GAP, Math.min(y, vh - CARD_HEIGHT - GAP));
  if (rect.right + GAP + CARD_WIDTH < vw) return { left: rect.right + GAP, top: clampTop(rect.top - 8) };
  if (rect.left - GAP - CARD_WIDTH > 0) return { left: rect.left - GAP - CARD_WIDTH, top: clampTop(rect.top - 8) };
  if (rect.bottom + 12 + CARD_HEIGHT < vh) return { left: clampLeft(rect.left), top: rect.bottom + 12 };
  if (rect.top - 12 - CARD_HEIGHT > 0) return { left: clampLeft(rect.left), top: rect.top - 12 - CARD_HEIGHT };
  return { left: clampLeft(rect.left + rect.width / 2 - CARD_WIDTH / 2), top: clampTop(rect.bottom - CARD_HEIGHT - 24) };
}

/** A short spotlight tour over the real UI — the dashboard's by default, or any `steps`. */
export function QuickTour({ onClose, steps = DASHBOARD_STEPS }: { onClose: () => void; steps?: TourStep[] }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Let each step prepare the page (e.g. open the right tab) once, when it
  // opens. Read through a ref: callers may rebuild `steps` on every render.
  const stepsRef = useRef(steps);
  useLayoutEffect(() => {
    stepsRef.current = steps;
  });
  useEffect(() => {
    stepsRef.current[index]?.onShow?.();
  }, [index]);

  // Follow the target as the window resizes or the sidebar expands.
  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      const box = el?.getBoundingClientRect();
      setRect(box && box.width > 0 && box.height > 0 ? box : null);
    };
    measure();
    window.addEventListener("resize", measure);
    const timer = setInterval(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      clearInterval(timer);
    };
  }, [step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, steps.length]);

  // The card sits beside the target when it can, or centered when there's no target.
  const cardStyle: React.CSSProperties = rect
    ? placeCard(rect)
    : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Quick tour">
      {rect ? (
        // The spotlight: a clear box over the target with everything else dimmed by its shadow.
        <div
          className="absolute rounded-lg ring-2 ring-accent transition-all duration-300 pointer-events-none"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(10, 10, 10, 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-950/55" />
      )}
      {/* Clicks outside the card do nothing, so the tour isn't lost by accident. */}
      <div className="absolute inset-0" />

      <div
        className="toast-enter absolute rounded-lg border border-neutral-300 bg-white shadow-2xl p-5"
        style={{ ...cardStyle, width: CARD_WIDTH, maxWidth: "calc(100vw - 32px)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold text-accent-strong">
            Step {index + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            {isLast ? "Close" : "Skip tour"}
          </button>
        </div>
        <h2 className="mt-1 text-base font-bold tracking-tight text-neutral-950">{step.title}</h2>
        <p className="mt-1 text-sm text-neutral-600 leading-relaxed">{step.body}</p>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex gap-1 mr-auto" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.target} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-accent" : "w-1.5 bg-neutral-300"}`} />
            ))}
          </div>
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onClose() : setIndex(index + 1))}
            className="px-3.5 py-2 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
