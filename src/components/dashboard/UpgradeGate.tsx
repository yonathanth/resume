"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";
import { ICON_TONES, type OptionTone } from "./create-flow/OptionCard";

export interface GateBenefit {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  tone?: OptionTone;
}

/**
 * A page (or section) that comes with Plus and Pro, shown to someone on Free:
 * what it is, what it looks like, what it does for them, and the way in. It
 * replaces a bare "comes with Plus and Pro" empty state, so the page sells
 * the feature instead of just saying no.
 */
export function UpgradeGate({
  icon: Icon,
  title,
  tagline,
  benefits,
  preview,
  onUpgrade,
  upgradeLabel = "Upgrade to unlock",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tagline: string;
  benefits: GateBenefit[];
  /** An illustration of the feature with example content, on the right. */
  preview?: React.ReactNode;
  /** Opens the upgrade modal (checkout without leaving the page). */
  onUpgrade: () => void;
  upgradeLabel?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_12px_32px_-24px_rgba(15,17,21,0.3)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* The pitch */}
        <div className="p-7 sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-strong">
            <Crown className="h-3.5 w-3.5" /> Plus &amp; Pro
          </span>
          <div className="mt-5 flex items-center gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-b ${ICON_TONES.accent}`}>
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-[28px]">{title}</h2>
          </div>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-neutral-600">{tagline}</p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onUpgrade}
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 cursor-pointer"
            >
              <Crown className="h-4 w-4 text-accent-light" />
              {upgradeLabel}
              <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
            </button>
            <Link
              href="/dashboard/upgrade"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-400"
            >
              See plans
            </Link>
          </div>
        </div>

        {/* What it looks like */}
        {preview && (
          <div
            aria-hidden="true"
            className="relative hidden min-h-[280px] overflow-hidden border-l border-neutral-100 bg-gradient-to-br from-accent-soft via-white to-neutral-50 p-8 lg:block"
          >
            {preview}
          </div>
        )}
      </div>

      {/* What it does for you */}
      <ul className="grid grid-cols-1 gap-px border-t border-neutral-100 bg-neutral-100 sm:grid-cols-2">
        {benefits.map(({ icon: BenefitIcon, title: benefitTitle, text, tone = "neutral" }) => (
          <li key={benefitTitle} className="flex items-start gap-3.5 bg-white p-6">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-b ${ICON_TONES[tone]}`}>
              <BenefitIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-950">{benefitTitle}</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-neutral-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
