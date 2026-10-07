"use client";

import React from "react";
import { ArrowRight, FileText, Loader2 } from "lucide-react";
import { SOFT_TONES } from "./OptionCard";
import { templateLabel, type PastProjectOption } from "./types";

/**
 * The user's own saved resumes as a simple list. Clicking one picks it
 * straight away — no select-then-confirm.
 */
export function ResumePicker({
  resumes,
  onPick,
  loadingId,
  disabled = false,
}: {
  resumes: PastProjectOption[];
  onPick: (id: string) => void;
  /** The resume currently being read, if any — shows a spinner on it. */
  loadingId?: string | null;
  disabled?: boolean;
}) {
  if (resumes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-500">
        You haven&apos;t made any resumes yet.
      </div>
    );
  }

  return (
    <div className="max-h-[360px] space-y-2 overflow-y-auto p-1">
      {resumes.map((resume) => (
        <button
          key={resume.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(resume.id)}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition-colors hover:border-accent-border disabled:cursor-wait"
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${SOFT_TONES.blue}`}>
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900">{resume.title}</span>
            <span className="block truncate text-xs text-neutral-500">
              {templateLabel(resume.templateStyle)} · Edited {resume.lastEdited}
            </span>
          </span>
          {loadingId === resume.id ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
          ) : (
            <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-600" />
          )}
        </button>
      ))}
    </div>
  );
}
