"use client";

import React from "react";
import { ChevronRight, Crown } from "lucide-react";

// Soft glossy icon tiles, matching the Builder's action cards.
export const ICON_TONES = {
  // The brand accent (see --accent in globals.css).
  accent:
    "from-accent-mid to-accent border-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-4px_color-mix(in_srgb,var(--accent-light)_35%,transparent)]",
  sky: "from-sky-500 to-sky-600 border-sky-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-4px_rgba(14,165,233,0.3)]",
  violet:
    "from-violet-500 to-violet-600 border-violet-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-4px_rgba(139,92,246,0.35)]",
  emerald:
    "from-emerald-500 to-emerald-600 border-emerald-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-4px_rgba(16,185,129,0.3)]",
  neutral:
    "from-white to-neutral-100 border-neutral-200 text-neutral-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-4px_rgba(0,0,0,0.12)]",
} as const;

export type OptionTone = keyof typeof ICON_TONES;

// The softer pastel tiles used on the dashboard's main action cards (and the
// Help center): a light wash with a darker icon in the same hue.
export const SOFT_TONES = {
  peach: "bg-[#fdebe1] border-[#f3cfbb] text-[#9a3d12] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
  blue: "bg-[#e2f1f6] border-[#c2dfe9] text-[#155e75] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
  lavender: "bg-[#ede7fb] border-[#d5c9f2] text-[#5b2a9e] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
  sage: "bg-[#e8f2e3] border-[#cbe0c2] text-[#2f5d23] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
} as const;
export type SoftTone = keyof typeof SOFT_TONES;

interface OptionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tone?: OptionTone;
  /** Accepted for call-site compatibility; options are never highlighted. */
  selected?: boolean;
  /**
   * "locked": a Pro feature on a free plan — highlighted with a Pro badge, and
   * clicking it opens the paywall. "unavailable": nothing to pick from yet
   * (no profiles, no saved resumes) — shown faded and can't be clicked.
   */
  state?: "locked" | "unavailable";
  onClick: () => void;
}

/**
 * A step option in the create flows: tinted icon tile, copy, and a chevron.
 * Options are never shown as pre-selected — the flows don't favour any choice.
 */
export function OptionCard({ icon: Icon, title, description, tone = "neutral", state, onClick }: OptionCardProps) {
  const locked = state === "locked";
  const unavailable = state === "unavailable";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      aria-disabled={unavailable}
      className={`group w-full p-4 rounded-xl border text-left transition-colors flex items-center gap-4 ${
        locked
          ? "border-amber-300 bg-[linear-gradient(135deg,#fff8e6_0%,#fffdf6_55%,#ffffff_100%)] hover:border-amber-400 cursor-pointer"
          : unavailable
            ? "border-dashed border-neutral-200 bg-neutral-50/60 opacity-60 cursor-not-allowed"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/60 cursor-pointer"
      }`}
    >
      <span
        className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-b border ${
          unavailable ? ICON_TONES.neutral : ICON_TONES[tone]
        }`}
      >
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
          {title}
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
        </span>
        <span className="block text-sm text-neutral-500 mt-0.5 leading-snug">{description}</span>
      </span>
      {!unavailable && (
        <ChevronRight
          className={`w-4 h-4 shrink-0 transition-all group-hover:translate-x-0.5 ${
            locked ? "text-amber-500 group-hover:text-amber-700" : "text-neutral-300 group-hover:text-neutral-700"
          }`}
        />
      )}
    </button>
  );
}
