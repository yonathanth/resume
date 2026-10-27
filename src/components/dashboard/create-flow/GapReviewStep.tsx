"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Loader2, Minus, Plus } from "lucide-react";
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
  // Which picked rows have their optional "where / how" field open.
  const [detailOpen, setDetailOpen] = useState<Record<string, boolean>>({});

  const selected = gaps
    .filter((gap) => checked[gap])
    .map((gap) => ({ gap, detail: (details[gap] ?? "").trim() }));
  const allSelected = selected.length === gaps.length;
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => setChecked(allSelected ? {} : Object.fromEntries(gaps.map((gap) => [gap, true])));

  const box = (on: boolean, partial = false) => (
    <span
      aria-hidden
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
        on || partial ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white"
      }`}
    >
      {on ? <Check className="w-3 h-3" strokeWidth={3} /> : partial ? <Minus className="w-3 h-3" strokeWidth={3} /> : null}
    </span>
  );

  return (
    <div>
      <div className="text-center mb-5">
        <h2 className="text-xl font-bold tracking-tight text-neutral-950">Do you have any of these?</h2>
        <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
          The job asks for them, but your CV doesn&apos;t show them. Pick the ones you have and we&apos;ll add them. Nothing
          you leave unpicked goes in.
        </p>
      </div>

      <div className="flex items-center justify-between px-1 mb-2">
        <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={allSelected} disabled={busy} onChange={toggleAll} className="sr-only" />
          {box(allSelected, someSelected)}
          Select all
        </label>
        <span className="text-xs font-medium text-neutral-500 tabular-nums">
          {selected.length} of {gaps.length}
        </span>
      </div>

      <ul className="space-y-2 mb-6">
        {gaps.map((gap) => {
          const isChecked = Boolean(checked[gap]);
          const showDetail = isChecked && (detailOpen[gap] || Boolean(details[gap]));
          return (
            <li
              key={gap}
              className={`rounded-xl border transition-colors ${
                isChecked ? "border-neutral-950 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <label className="flex items-start gap-3 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={busy}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [gap]: e.target.checked }))}
                  className="sr-only"
                />
                <span className="mt-px">{box(isChecked)}</span>
                <span className="min-w-0 flex-1 text-sm leading-snug text-neutral-900">{gap}</span>
              </label>
              {isChecked && (
                <div className="pl-[2.6rem] pr-3.5 pb-3 -mt-1">
                  {showDetail ? (
                    <input
                      type="text"
                      autoFocus={!details[gap]}
                      value={details[gap] ?? ""}
                      maxLength={200}
                      disabled={busy}
                      onChange={(e) => setDetails((prev) => ({ ...prev, [gap]: e.target.value }))}
                      placeholder="e.g. used it daily at Acme, 2022–2024"
                      className="w-full px-2.5 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/10"
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDetailOpen((prev) => ({ ...prev, [gap]: true }))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add where or how (optional)
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* One main action: add what's picked, or carry on without adding anything. */}
      <button
        type="button"
        disabled={busy}
        onClick={() => (selected.length > 0 ? onAdd(selected) : onSkip())}
        className="w-full py-3.5 rounded-lg bg-neutral-950 text-white font-semibold text-sm hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>
          {busy
            ? "Adding to your CV..."
            : selected.length > 0
              ? `Add ${selected.length} to my CV`
              : "Continue without adding"}
        </span>
        {!busy && <ArrowRight className="w-4 h-4" />}
      </button>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          disabled={busy}
          onClick={onBack}
          className="py-2 px-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Back
        </button>
        {selected.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={onSkip}
            className="py-2 px-1 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Skip, add nothing
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 font-medium text-center mt-3">{error}</p>}
    </div>
  );
}
