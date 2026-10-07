"use client";

import React from "react";
import { ArrowRight, Loader2, X } from "lucide-react";
import { TemplatePicker } from "./TemplatePicker";
import { TemplateId, templateLabel } from "./types";

/**
 * The shared frame for the create / tailor / enhance flows: never taller than
 * the viewport (the body scrolls instead), a little wider for the template step
 * (two previews per row) and
 * compact otherwise. Each step slides in, keyed on `stepKey`.
 */
export function FlowModal({
  stepKey,
  wide = false,
  onClose,
  children,
  outside,
}: {
  stepKey: string;
  wide?: boolean;
  /** Omit for a flow that can't be dismissed (no close button). */
  onClose?: () => void;
  children: React.ReactNode;
  /** Rendered over the frame (nested dialogs), outside the card. */
  outside?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          wide ? "max-w-xl" : "max-w-lg"
        } max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col bg-white rounded-2xl border border-neutral-200/90 shadow-2xl overflow-hidden transition-[max-width] duration-300 animate-in zoom-in-95`}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto p-7 sm:p-9">
          <FlowStep stepKey={stepKey}>{children}</FlowStep>
        </div>
      </div>
      {outside}
    </div>
  );
}

/** Slides a step's content in whenever the step changes. */
export function FlowStep({ stepKey, children }: { stepKey: string; children: React.ReactNode }) {
  return (
    <div key={stepKey} className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
      {children}
    </div>
  );
}

/** A quiet line above a step's title — replaces the old pill tags. */
export function StepEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-accent-strong mb-1.5">{children}</p>;
}

/**
 * "Choose a Template" as a full step: the gallery, then a sticky bar to
 * continue. Must sit directly inside FlowModal's padded body (the bar's
 * negative margins undo that padding).
 */
export function TemplateStep({
  selectedId,
  onSelect,
  onContinue,
  onBack,
  busy = false,
  error,
}: {
  selectedId: TemplateId;
  onSelect: (id: TemplateId) => void;
  onContinue: (id: TemplateId) => void;
  /** Shown as a Back button beside Continue when given. */
  onBack?: () => void;
  /** The AI is working on what Continue started — show progress, block repeats. */
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <div>
      <div className="text-center mb-8 pr-6">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950">Choose a Template</h2>
        <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed max-w-md mx-auto">
          We&apos;ll only ask for what this template needs. You can switch later without losing anything.
        </p>
      </div>

      <TemplatePicker
        selectedId={selectedId}
        onSelect={onSelect}
        onConfirm={(id) => {
          onSelect(id);
          onContinue(id);
        }}
      />

      <div className="sticky -bottom-7 sm:-bottom-9 -mx-7 sm:-mx-9 -mb-7 sm:-mb-9 mt-8 px-7 sm:px-9 py-4 bg-white/80 backdrop-blur-md border-t border-neutral-200 flex items-center justify-between gap-4">
        {error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-neutral-500 truncate">
            Selected: <span className="font-semibold text-neutral-950">{templateLabel(selectedId)}</span>
            <span className="hidden sm:inline"> · You can change it later in the editor</span>
          </p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => onContinue(selectedId)}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {busy ? "Working..." : "Continue"}
            {!busy && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * What the job asks for that the CV doesn't show (the AI's "no match"
 * requirements — it never invents them). Renders nothing when there are none.
 */
export function JobGaps({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null;
  return (
    <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 text-left">
      <p className="text-sm font-semibold text-neutral-900">Not covered by your CV</p>
      <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
        The job asks for these, but your CV doesn&apos;t show them. If you have any of them, add them in the editor.
      </p>
      <ul className="mt-3 space-y-1.5">
        {gaps.map((gap) => (
          <li key={gap} className="flex items-start gap-2 text-sm text-neutral-700">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {gap}
          </li>
        ))}
      </ul>
    </div>
  );
}
