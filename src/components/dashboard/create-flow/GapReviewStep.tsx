"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Loader2, Minus } from "lucide-react";
import { CVContentDTO } from "@/lib/api";

export interface ConfirmedGap {
  gap: string;
  /** What the user wrote about it — may be empty (just "add this"). */
  detail: string;
}

// Words that say what kind of requirement it is, not what it's about — a CV
// can show "AWS" without the words "AWS experience".
const GENERIC_WORDS = new Set([
  "a", "an", "and", "or", "of", "in", "on", "with", "for", "the", "to", "plus",
  "experience", "experienced", "knowledge", "skill", "skills", "proficiency", "proficient",
  "familiarity", "understanding", "strong", "solid", "working", "hands", "year", "years",
  "certification", "certified", "certificate", "degree", "background",
]);

function keyWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [])
    .map((word) => word.replace(/\.+$/, ""))
    // Numbers ("5+ years") are part of the ask, not something the CV names.
    .filter((word) => word && !GENERIC_WORDS.has(word) && !/^[0-9+.]+$/.test(word));
}

/** The confirmed gaps the CV still doesn't mention (every key word must appear somewhere). */
export function gapsNotInContent(content: CVContentDTO, confirmed: ConfirmedGap[]): string[] {
  const words = new Set(keyWords(JSON.stringify(content)));
  return confirmed
    .map(({ gap }) => gap)
    .filter((gap) => {
      const needed = keyWords(gap);
      return needed.length > 0 && !needed.every((word) => words.has(word));
    });
}

/** After the gap review: which of the job's requirements the user's picks put into the CV. */
export function GapOutcome({ added }: { added: string[] }) {
  if (added.length === 0) return null;
  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-left">
      <p className="text-sm font-semibold text-emerald-900">Added to your CV</p>
      <p className="mt-0.5 text-xs leading-relaxed text-emerald-800/80">From what you picked. Check how they read in the editor.</p>
      <ul className="mt-2.5 space-y-1.5">
        {added.map((gap) => (
          <li key={gap} className="flex items-start gap-2 text-sm text-emerald-950">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {gap}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The skills sections with `items` added — to the flat list and, when it has them, the last skill group. */
export function withAddedSkills(content: CVContentDTO, items: string[]): CVContentDTO {
  const skills = [...(content.skills ?? []), ...items];
  const groups = content.skillGroups ?? [];
  if (groups.length === 0) return { skills };
  const last = groups[groups.length - 1];
  return {
    skills,
    skillGroups: [...groups.slice(0, -1), { ...last, items: [...(last.items ?? []), ...items] }],
  };
}

/**
 * Shown right after tailoring when the job asks for things the CV doesn't
 * show. The user may simply have left them out: whatever they select is added
 * to the CV (optionally with where/when), or they continue with it as it is.
 */
export function GapReviewStep({
  gaps,
  onAdd,
  onSkip,
  onBack,
  busy = false,
  error,
}: {
  gaps: string[];
  onAdd: (selected: ConfirmedGap[]) => void;
  onSkip: () => void;
  onBack: () => void;
  /** The AI is re-tailoring with the selected gaps. */
  busy?: boolean;
  error?: string | null;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, string>>({});

  const selected = gaps
    .filter((gap) => checked[gap])
    .map((gap) => ({ gap, detail: (details[gap] ?? "").trim() }));
  const allSelected = selected.length === gaps.length;
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => setChecked(allSelected ? {} : Object.fromEntries(gaps.map((gap) => [gap, true])));

  const box = (on: boolean, partial = false) => (
    <span
      aria-hidden
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        on || partial ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white"
      }`}
    >
      {on ? <Check className="w-3 h-3" /> : partial ? <Minus className="w-3 h-3" /> : null}
    </span>
  );

  return (
    <div>
      <div className="text-center mb-5">
        <h2 className="text-xl font-bold tracking-tight text-neutral-950">Did we miss anything?</h2>
        <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
          The job asks for these, but your CV doesn&apos;t show them. Select the ones you have and we&apos;ll add them
          to your CV. Anything you leave unselected stays out.
        </p>
      </div>

      <label className="flex items-center gap-3 px-3 mb-2 cursor-pointer text-sm font-semibold text-neutral-700">
        <input type="checkbox" checked={allSelected} disabled={busy} onChange={toggleAll} className="sr-only" />
        {box(allSelected, someSelected)}
        Select all
        <span className="ml-auto text-xs font-medium text-neutral-500">
          {selected.length} of {gaps.length} selected
        </span>
      </label>

      <ul className="space-y-2 mb-6">
        {gaps.map((gap) => {
          const isChecked = Boolean(checked[gap]);
          return (
            <li
              key={gap}
              className={`rounded-xl border p-3 transition-colors ${
                isChecked ? "border-neutral-950 bg-white" : "border-neutral-200 bg-neutral-50/70"
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={busy}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [gap]: e.target.checked }))}
                  className="sr-only"
                />
                <span className="mt-0.5">{box(isChecked)}</span>
                <span className="text-sm font-medium text-neutral-900">{gap}</span>
                {isChecked && <span className="ml-auto shrink-0 text-xs font-semibold text-accent-strong">Will be added</span>}
              </label>
              {isChecked && (
                <input
                  type="text"
                  value={details[gap] ?? ""}
                  maxLength={200}
                  disabled={busy}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [gap]: e.target.value }))}
                  placeholder="Optional: where, when or how (e.g. used it daily at Acme, 2022–2024)"
                  className="mt-2.5 w-full p-2.5 rounded-lg bg-white border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <button
          type="button"
          disabled={busy || selected.length === 0}
          onClick={() => onAdd(selected)}
          className="w-full py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>
            {busy
              ? "Adding to your CV..."
              : selected.length > 0
                ? `Add ${selected.length} selected to my CV`
                : "Select what to add"}
          </span>
          {!busy && selected.length > 0 && <ArrowRight className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onBack}
            className="w-1/3 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSkip}
            className="w-2/3 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Continue as is
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 font-medium text-center mt-3">{error}</p>}
    </div>
  );
}
