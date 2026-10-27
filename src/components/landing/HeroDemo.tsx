"use client";

import React, { useEffect, useState } from "react";
import { Check, WandSparkles } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// The hero's picture of the outcome: one CV, before and after — vague bullets
// rewritten into results, the score and the job match climbing with them.
// It loops on its own (still, on the "after", for reduced motion).

const BULLETS = [
  {
    before: "Responsible for managing social media accounts.",
    after: "Grew Instagram from 12K to 48K followers in 9 months with a weekly content calendar.",
  },
  {
    before: "Helped with marketing campaigns and events.",
    after: "Ran 6 product launch campaigns, adding 2,300 sign-ups at a 4.1% conversion rate.",
  },
  {
    before: "Worked with the sales team.",
    after: "Built a lead-handoff process with sales that cut follow-up time from 3 days to 1.",
  },
];
const STEPS = ["Rewritten with real results", "Matched to the job", "ATS-ready layout"];
const SCORE = { before: 48, after: 86 };
const MATCH = { before: 41, after: 92 };
const CYCLE_MS = 3600;

function useCountTo(target: number, ms = 900) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const from = value;
    if (from === target) return;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animates from wherever it is now
  }, [target, ms]);
  return value;
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const stroke = size > 80 ? 9 : 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 75 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eeeeee" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          style={{ transition: "stroke 600ms ease" }}
        />
      </svg>
      <span className={`absolute font-bold tabular-nums ${size > 80 ? "text-4xl" : "text-lg"}`} style={{ color }}>
        {score}
      </span>
    </span>
  );
}

export function HeroDemo({ compact = false }: { compact?: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const [after, setAfter] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setAfter((v) => !v), CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);
  const showAfter = after || reducedMotion;

  const score = useCountTo(showAfter ? SCORE.after : SCORE.before);
  const match = useCountTo(showAfter ? MATCH.after : MATCH.before);
  const bullets = compact ? BULLETS.slice(0, 2) : BULLETS;

  const badge = (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors duration-500 ${
        showAfter ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {showAfter ? (
        <>
          <WandSparkles className="h-3.5 w-3.5" /> After
        </>
      ) : (
        "Before"
      )}
    </span>
  );

  const bulletList = (big: boolean) => (
    <ul className={big ? "mt-3 space-y-4" : "mt-2.5 space-y-2.5"}>
      {bullets.map((b) => (
        <li key={b.before} className={`relative grid pl-4 leading-snug ${big ? "text-[16.5px]" : "text-[14px]"}`}>
          <span className={`absolute left-0 h-1.5 w-1.5 rounded-full transition-colors duration-500 ${big ? "top-[9px]" : "top-[7px]"} ${showAfter ? "bg-accent" : "bg-neutral-300"}`} />
          {/* One fades out, then the other fades in, so the two never overlap; both share a cell so nothing jumps. */}
          <span
            className="col-start-1 row-start-1 text-neutral-400 transition-opacity duration-300"
            style={{ opacity: showAfter ? 0 : 1, transitionDelay: showAfter ? "0ms" : "300ms" }}
          >
            {b.before}
          </span>
          <span
            className="col-start-1 row-start-1 text-neutral-800 transition-opacity duration-300"
            style={{ opacity: showAfter ? 1 : 0, transitionDelay: showAfter ? "300ms" : "0ms" }}
          >
            {b.after}
          </span>
        </li>
      ))}
    </ul>
  );

  const steps = (
    <ul className="space-y-2">
      {STEPS.map((step, i) => (
        <li
          key={step}
          className="flex items-center gap-2 text-[14px] text-neutral-700 transition-opacity duration-500"
          style={{ opacity: showAfter ? 1 : 0.35, transitionDelay: showAfter ? `${i * 120}ms` : "0ms" }}
        >
          <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${showAfter ? "bg-emerald-600 text-white" : "bg-neutral-300 text-white"}`}>
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
          {step}
        </li>
      ))}
    </ul>
  );

  const matchBar = (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium text-neutral-600">Match with the job</span>
        <span className="font-bold tabular-nums text-neutral-950">{match}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${match}%` }} />
      </div>
    </div>
  );

  return (
    <div className="relative w-full" aria-label="Example: a CV before and after GoMoxie" role="img">
      {compact ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 text-left shadow-[0_30px_80px_-40px_rgba(15,17,21,0.35)]">
          <div className="flex items-center gap-4 border-b border-neutral-100 pb-4">
            <ScoreRing score={score} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-neutral-950">Maya Chen</div>
              <div className="text-[13px] text-neutral-500">Marketing Coordinator → Growth Marketer</div>
            </div>
            {badge}
          </div>
          <div className="pt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Experience</div>
            {bulletList(false)}
          </div>
          <div className="mt-5 rounded-2xl bg-neutral-50 p-4">{matchBar}</div>
        </div>
      ) : (
        // Wide: the CV on the left, what it scores on the right.
        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] overflow-hidden rounded-3xl border border-neutral-200 bg-white text-left shadow-[0_40px_100px_-50px_rgba(15,17,21,0.4)]">
          <div className="p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-neutral-950">Maya Chen</div>
                <div className="text-[14px] text-neutral-500">Marketing Coordinator → Growth Marketer</div>
              </div>
              {badge}
            </div>
            <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Experience</div>
            {bulletList(true)}
          </div>
          <div className="flex flex-col justify-center gap-6 border-l border-neutral-100 bg-neutral-50/70 p-8">
            <div className="flex items-center gap-4">
              <ScoreRing score={score} size={112} />
              <div>
                <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-400">CV score</div>
                <div className="mt-1 text-[14px] text-neutral-600">{showAfter ? "Ready to send" : "Needs work"}</div>
              </div>
            </div>
            {matchBar}
            {steps}
          </div>
        </div>
      )}
      <p className="mt-3 text-center text-[12px] text-neutral-400">Example of a rewrite. Your results depend on your experience.</p>
    </div>
  );
}
