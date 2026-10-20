"use client";

import React, { useState } from "react";
import { ChevronDown, Lock, Sparkles } from "lucide-react";
import { ApiError, WordingPreview, applyCvWording } from "@/lib/api";
import { useInvalidateProfiles } from "@/hooks/use-profiles";

// Enhance's last step: the improved CV rewrote entries the user's career
// profile already has. Show each one's current wording next to the improved
// wording and let the user choose which to keep in the profile — the AI wrote
// it, so nothing is saved without a yes. Approved entries become the user's
// own (locked), so later CVs won't change them.

interface WordingReviewStepProps {
  cvDocumentId: string;
  preview: WordingPreview & { profile: NonNullable<WordingPreview["profile"]> };
  children?: React.ReactNode;
  onFinish: () => void;
  onProRequired: (err: unknown) => boolean;
}

export function WordingReviewStep({ cvDocumentId, preview, children, onFinish, onProRequired }: WordingReviewStepProps) {
  const invalidateProfiles = useInvalidateProfiles();
  // Entries the user edited by hand start unticked — replacing those is a deliberate choice.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preview.proposals.filter((p) => !p.locked).map((p) => p.key))
  );
  // The entry whose before/after wording is shown — one at a time, so long entries don't fill the step.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, proposals } = preview;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await applyCvWording(profile.id, { cvDocumentId, version: profile.version, keys: [...selected] });
      invalidateProfiles(profile.id);
      onFinish();
    } catch (err) {
      if (onProRequired(err)) return;
      setError(
        err instanceof ApiError && err.code === "PROFILE_VERSION_CONFLICT"
          ? "The profile changed while you were reviewing. Open the editor and update it from the profile page."
          : err instanceof ApiError
            ? err.message
            : "Could not save the wording. Your CV is saved either way."
      );
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-5">
        <span className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-b from-violet-500 to-violet-600 border border-violet-600 text-white">
          <Sparkles className="w-5 h-5" />
        </span>
        <h2 className="text-xl font-bold tracking-tight text-neutral-950">Use the improved wording in your {profile.title} profile?</h2>
        <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
          Keep only wording you know is accurate. Ticked entries replace what the profile has now, so your next CVs start
          from them.
        </p>
      </div>

      <ul className="space-y-3 mb-5 max-h-[45vh] overflow-y-auto pr-1">
        {proposals.map((proposal) => {
          const checked = selected.has(proposal.key);
          const open = openKey === proposal.key;
          const panelId = `wording-${proposal.key}`;
          return (
            <li key={proposal.key} className={`rounded-xl border p-3.5 ${checked ? "border-neutral-900 bg-white" : "border-neutral-200 bg-neutral-50/60"}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(proposal.key)}
                  aria-label={`Use the improved ${proposal.label}`}
                  className="mt-1 accent-neutral-900 cursor-pointer"
                />
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(open ? null : proposal.key)}
                  className="min-w-0 flex-1 flex items-start gap-2 text-left cursor-pointer"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                      {proposal.label}
                      {proposal.locked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500" title="You edited this entry by hand before">
                          <Lock className="w-3 h-3" /> edited by you
                        </span>
                      )}
                    </span>
                    {!open && <span className="mt-0.5 block truncate text-xs text-neutral-500">{proposal.after.join(" ")}</span>}
                  </span>
                  <ChevronDown className={`mt-0.5 w-4 h-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </div>
              {open && (
                <div id={panelId} className="mt-2 ml-7 grid gap-2 text-xs leading-relaxed">
                  <div>
                    <span className="block font-semibold text-neutral-500 mb-0.5">Now</span>
                    {proposal.before.map((line, i) => (
                      <span key={i} className="block text-neutral-500 line-through decoration-neutral-300">
                        {line}
                      </span>
                    ))}
                  </div>
                  <div>
                    <span className="block font-semibold text-emerald-700 mb-0.5">Improved</span>
                    {proposal.after.map((line, i) => (
                      <span key={i} className="block text-neutral-900">
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {children}
      {error && <p className="text-xs text-red-600 font-medium text-center mb-2">{error}</p>}

      <div className="space-y-2">
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={save}
          className="w-full py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Saving..." : `Save ${selected.size} to profile and Continue`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onFinish}
          className="w-full py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-semibold text-sm hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
