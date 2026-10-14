"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CtaButton } from "@/components/CtaButton";
import { Reveal } from "@/components/Reveal";

// Mirrors what the app actually sells: free accounts get one free AI
// generation per dashboard tab — Create, Tailor, Improve — one-time-only
// (entitlement.service.ts's FlowType). Pro is unlimited, from $4.99/week
// through Polar (weekly/monthly/3-month tiers — see /pricing for all three),
// or a fixed 80 ETB/month through Chapa (local market, no auto-renewal).

const FREE_FEATURES = [
  "1 free use each of Create, Tailor and Improve",
  "Every recruiter-tested template",
  "Import your old CV (PDF or DOCX)",
  "Click-to-edit resume editor",
  "PDF download",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited AI resume generations",
  "Unlimited tailoring to job posts",
  "Unlimited resume improvements",
  "Cancel anytime",
];

function FeatureList({ items, strong }: { items: string[]; strong?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-[14.5px] text-neutral-700">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              strong ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
      {/* Header */}
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
          Simple <span className="text-accent">pricing.</span>
        </h2>
      </Reveal>

      {/* Plans */}
      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* Free */}
        <Reveal>
        <div className="flex h-full flex-col rounded-3xl border border-neutral-200 bg-white p-8 shadow-[0_12px_32px_-22px_rgba(15,17,21,0.25)]">
          <h3 className="text-[17px] font-semibold text-neutral-950">Free</h3>
          <p className="mt-1 text-[14px] text-neutral-500">Try it on your next application.</p>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tracking-tight text-neutral-950">$0</span>
            <span className="text-[14px] text-neutral-400">forever</span>
          </div>
          <p className="mt-1.5 text-[13px] text-neutral-400">No card needed</p>
          <div className="mt-5">
            <CtaButton href="/signup" variant="secondary" className="w-full">
              Start for free
            </CtaButton>
          </div>
          <div className="mt-8 border-t border-neutral-100 pt-7">
            <FeatureList items={FREE_FEATURES} />
          </div>
        </div>

        </Reveal>

        {/* Pro */}
        <Reveal delay={120}>
        <div className="relative h-full">
          <div className="relative flex h-full flex-col rounded-3xl border border-neutral-300 bg-white p-8 shadow-[0_18px_44px_-26px_rgba(15,17,21,0.35)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-neutral-950">Pro</h3>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent-strong">Most popular</span>
            </div>
            <p className="mt-1 text-[14px] text-neutral-500">For an active job search.</p>
            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="text-[13px] text-neutral-400">from</span>
              <span className="text-5xl font-bold tracking-tight text-neutral-950">$4.99</span>
              <span className="text-[14px] text-neutral-400">/ week</span>
            </div>
            <p className="mt-1.5 text-[13px] text-neutral-400">weekly, monthly or 3-month plans — or 80 ETB/month in Ethiopia via Chapa</p>
            <div className="mt-5">
              <CtaButton href="/signup" className="w-full">
                Get Pro
              </CtaButton>
            </div>
            <div className="mt-8 border-t border-neutral-100 pt-7">
              <FeatureList items={PRO_FEATURES} strong />
            </div>
          </div>
        </div>
        </Reveal>
      </div>

      {/* Footnote */}
      <Reveal className="mt-12 flex flex-col items-center text-center">
        <Link
          href="/pricing"
          className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-neutral-600 transition-colors hover:text-neutral-950"
        >
          See full pricing &amp; FAQ
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </section>
  );
}
