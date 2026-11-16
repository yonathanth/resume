"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, FilePlus, PenLine, Target } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ICON_TONES, type OptionTone } from "@/components/dashboard/create-flow/OptionCard";

/** The three ways in, as the dashboard shows them. */
const ACTIONS: { title: string; sub: string; Icon: React.ComponentType<{ className?: string }>; tone: OptionTone }[] = [
  { title: "Create a new resume", sub: "Start fresh, ready in minutes", Icon: FilePlus, tone: "accent" },
  { title: "Improve a CV", sub: "Strengthen one you already have", Icon: PenLine, tone: "violet" },
  { title: "Tailor to a job", sub: "Match your CV to a job posting", Icon: Target, tone: "sky" },
];

/** What it looks like: the dashboard's three ways in, and a CV score after the tips. */
function FeaturesPreview() {
  const score = 86;
  const r = 20;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto max-w-sm pb-6 pt-2">
      <div className="space-y-2.5">
        {ACTIONS.map(({ title, sub, Icon, tone }, i) => (
          <div
            key={title}
            className={`flex items-center gap-3 rounded-lg border bg-gradient-to-b from-white to-neutral-50 p-3.5 shadow-[0_12px_28px_-18px_rgba(15,17,21,0.35)] ${
              i === 0 ? "border-accent-border" : "border-neutral-200"
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-b ${ICON_TONES[tone]}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-neutral-950">{title}</span>
              <span className="block truncate text-[11px] text-neutral-500">{sub}</span>
            </span>
            {i === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-white">
                Start <ArrowRight className="h-3 w-3" />
              </span>
            ) : (
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            )}
          </div>
        ))}
      </div>

      {/* …and how the CV scores once it's done */}
      <div className="absolute -bottom-3 -right-3 z-10 flex rotate-[-3deg] items-center gap-3 rounded-lg border border-neutral-200 bg-white py-2.5 pl-2.5 pr-4 shadow-lg">
        <span className="relative flex h-12 w-12 items-center justify-center">
          <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
            <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-neutral-100" />
            <circle
              cx="24"
              cy="24"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / 100)}
              className="text-emerald-500"
            />
          </svg>
          <span className="text-sm font-bold tabular-nums text-neutral-950">{score}</span>
        </span>
        <span>
          <span className="block text-[12px] font-bold text-neutral-950">CV score</span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <Check className="h-3 w-3" /> +24 after tips
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Everything gomoxie does, after the hero, in the style of the dashboard's
 * upgrade gates: the pitch, and a preview
 * beside it.
 */
export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-page px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
          Start <span className="text-accent">wherever</span> you are.
          <br />
          <span className="text-neutral-400">We take it from there.</span>
        </h2>
      </Reveal>

      <Reveal delay={100} className="mt-12">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,17,21,0.03),0_24px_60px_-32px_rgba(15,17,21,0.18)]">
          <div className="grid grid-cols-1 lg:min-h-[480px] lg:grid-cols-[1.05fr_1fr]">
            {/* The pitch */}
            <div className="flex flex-col justify-center px-6 pb-8 pt-2 sm:px-10 sm:pb-10 lg:p-12">
              <h3 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-[32px] sm:leading-[1.15]">Everything your CV needs, in one place.</h3>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-neutral-600 sm:text-base">
                Starting from nothing, fixing an old CV, or applying for a specific role: create, improve, tailor and polish it all here.
              </p>

              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
                >
                  Try for free
                  <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-400"
                >
                  Browse templates
                </Link>
              </div>
            </div>

            {/* What it looks like: above the words on phones and tablets, beside them from lg */}
            <div
              aria-hidden="true"
              className="relative order-first flex items-center overflow-hidden bg-gradient-to-t from-white via-accent-soft/50 to-accent-soft px-5 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-10 lg:order-none lg:min-h-[400px] lg:bg-gradient-to-r lg:p-10 xl:p-14"
            >
              <div className="w-full">
                <FeaturesPreview />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
