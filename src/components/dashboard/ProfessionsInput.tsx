"use client";

import React, { useState } from "react";
import { Star, X } from "lucide-react";
import { ProfessionInput } from "./ProfessionInput";

export const MAX_PROFESSIONS = 5;

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The list with `title` added at the end (ignored if it's already there or the list is full). */
export function addProfession(list: string[], title: string): string[] {
  const clean = title.trim().replace(/\s+/g, " ");
  if (!clean || list.length >= MAX_PROFESSIONS || list.some((p) => sameTitle(p, clean))) return list;
  return [...list, clean];
}

/**
 * Several professions, main one first: chips for the chosen ones, and the
 * catalog typeahead to add more (pick a suggestion, or type your own and
 * press Enter). The first is the main one — the default headline on new
 * CVs; the star on another makes it the main one.
 *
 * `draft` is what's typed but not added yet, kept by the parent so a form
 * can count it as added when it's submitted.
 */
export function ProfessionsInput({
  id,
  value,
  onChange,
  draft,
  onDraftChange,
  autoFocus,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  draft: string;
  onDraftChange: (text: string) => void;
  autoFocus?: boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const full = value.length >= MAX_PROFESSIONS;

  const add = (title: string) => {
    const next = addProfession(value, title);
    if (next === value) {
      setNotice(full ? `You can add up to ${MAX_PROFESSIONS}.` : "Already on your list.");
      return;
    }
    setNotice(null);
    onChange(next);
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-2" aria-label="Your professions">
          {value.map((title, i) => {
            const main = i === 0;
            return (
              <li
                key={title}
                className={`inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm font-medium ${
                  main ? "border-accent-border bg-accent-soft text-neutral-900" : "border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                {main ? (
                  <Star className="mr-0.5 h-3.5 w-3.5 fill-accent text-accent" aria-label="Main profession" />
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange([title, ...value.filter((_, j) => j !== i)])}
                    title="Make this your main profession"
                    aria-label={`Make ${title} your main profession`}
                    className="mr-0.5 rounded-full text-neutral-300 hover:text-accent cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                {title}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  title="Remove"
                  aria-label={`Remove ${title}`}
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!full && (
        <ProfessionInput
          id={id}
          autoFocus={autoFocus}
          value={draft}
          onChange={(text) => {
            setNotice(null);
            onDraftChange(text);
          }}
          onCommit={add}
          placeholder={value.length ? "Add another (optional)" : undefined}
        />
      )}
      <p className="mt-1.5 text-xs text-neutral-500">
        {notice ??
          (value.length > 1
            ? "The starred one is your main profession, the headline on new CVs. Tap a star to change it."
            : `Pick from the list or type your own and press Enter. Add up to ${MAX_PROFESSIONS} if you work in more than one field.`)}
      </p>
    </div>
  );
}
