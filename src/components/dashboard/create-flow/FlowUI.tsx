"use client";

import { isPaidPlan, type GenerateCvMismatch } from "@/lib/api";
import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Compass, Loader2, X } from "lucide-react";
import { MoxieLoader, type MoxieLoaderProps } from "@/components/moxie";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { TemplatePicker } from "./TemplatePicker";
import { TemplateId, templateLabel } from "./types";

/** The long AI waits in the create / tailor / enhance flows. */
export type AiWait = "read-file" | "read-story" | "read-cv" | "write" | "improve" | "tailor";

/**
 * What Moxie does in each wait, and what she says while she does it — one
 * line at a time above her, each a short sentence about the step she's on.
 */
const AI_WAITS: Record<AiWait, Omit<MoxieLoaderProps, "done">> = {
  "read-file": {
    animation: "read",
    messages: ["Reading your CV…", "Finding your jobs and dates…", "Picking out your skills…", "Sorting it all into sections…"],
  },
  "read-story": {
    animation: "read",
    messages: ["Reading your story…", "Picking out your roles…", "Spotting the numbers that matter…", "Sorting it into sections…"],
  },
  "read-cv": {
    animation: "read",
    messages: ["Getting your resume ready…", "Pulling in your details…", "Lining it up with your template…"],
  },
  write: {
    animation: "write",
    messages: ["Writing your CV…", "Choosing strong action verbs…", "Turning duties into results…", "Fitting it to your template…"],
    doneMessage: "Your CV is ready!",
  },
  improve: {
    animation: "polish",
    messages: ["Improving your CV…", "Tightening every bullet…", "Bringing your results forward…", "Cutting the filler…"],
    doneMessage: "Your CV is sharper!",
  },
  tailor: {
    animation: "tailor",
    messages: ["Reading the job post…", "Matching your experience to it…", "Cutting what doesn't fit…", "Keeping it all true to you…"],
    doneMessage: "Tailored to the job!",
  },
};

/**
 * Moxie at work while the AI runs: on her own over the whole screen (the
 * flow's card steps aside — see FlowModal), one line of text above her.
 */
export function AiWaitLoader({
  wait,
  fileName,
  done = false,
}: {
  wait: AiWait;
  /** The uploaded file, named in the first line while it's read. */
  fileName?: string | null;
  /** The work finished — Moxie's ta-da (see useAiDone). */
  done?: boolean;
}) {
  const crowned = isPaidPlan(useSubscriptionStatus().data);
  const config = AI_WAITS[wait];
  const messages =
    wait === "read-file" && fileName ? [`Reading ${fileName}…`, ...config.messages.slice(1)] : config.messages;
  return <MoxieLoader {...config} messages={messages} done={done} crowned={crowned} />;
}

/** Long enough for her celebration jump to land, short enough not to feel like another wait. */
const AI_DONE_MS = 1200;

/**
 * Moxie's ta-da when the AI finishes the CV. A flow awaits `celebrate(wait)`
 * after a successful final AI step and before moving on (or closing); while
 * it runs, `done` is that wait, so the loader stays up in its done state.
 * Only call it on success — a failed call should drop straight back to the step.
 */
export function useAiDone() {
  const [done, setDone] = useState<AiWait | null>(null);
  const celebrate = useCallback(async (wait: AiWait) => {
    setDone(wait);
    await new Promise((resolve) => setTimeout(resolve, AI_DONE_MS));
    setDone(null);
  }, []);
  return { done, celebrate };
}

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
  loader,
}: {
  stepKey: string;
  wide?: boolean;
  /** Omit for a flow that can't be dismissed (no close button). */
  onClose?: () => void;
  children: React.ReactNode;
  /** Rendered over the frame (nested dialogs), outside the card. */
  outside?: React.ReactNode;
  /** Shown instead of the step while something long runs (see AiWaitLoader). */
  loader?: React.ReactNode;
}) {
  if (loader) wide = false;
  const waiting = Boolean(loader);
  useWarnBeforeLeaving(waiting);
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 transition-colors ${
        waiting ? "bg-transparent" : "bg-neutral-950/60 backdrop-blur-sm"
      }`}
    >
      <div
        inert={waiting}
        className={`relative w-full ${waiting ? "invisible" : ""} ${
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
          <FlowStepWithLoader stepKey={stepKey} loader={loader}>
            {children}
          </FlowStepWithLoader>
        </div>
      </div>
      {outside}
    </div>
  );
}

/**
 * While the AI is working, leaving (a refresh, closing the tab) would cut it
 * off mid-way — the browser asks first. Everything before it is kept anyway
 * (see flow-drafts), so this is only needed during the wait.
 */
function useWarnBeforeLeaving(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}

/** Slides a step's content in whenever the step changes. */
export function FlowStep({ stepKey, children }: { stepKey: string; children: React.ReactNode }) {
  return (
    <div key={stepKey} className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out">
      {children}
    </div>
  );
}

/**
 * A step that a loader can cover. The step stays mounted (just hidden) while
 * the loader shows, so anything typed into it survives a failed AI call.
 */
export function FlowStepWithLoader({
  stepKey,
  loader,
  children,
}: {
  stepKey: string;
  loader?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {loader && <FlowStep stepKey="loading">{loader}</FlowStep>}
      <div hidden={Boolean(loader)}>
        <FlowStep stepKey={stepKey}>{children}</FlowStep>
      </div>
    </>
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

      <div className="sticky -bottom-7 sm:-bottom-9 -mx-7 sm:-mx-9 -mb-7 sm:-mb-9 mt-8 px-7 sm:px-9 py-4 bg-white/80 backdrop-blur-md border-t border-neutral-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-4 gap-y-3">
        {error ? (
          <p className="w-full sm:w-auto text-sm font-medium text-red-600">{error}</p>
        ) : (
          // Hidden on phones: no room beside the buttons, and the picked card is already highlighted.
          <p className="hidden sm:block text-sm text-neutral-500 truncate">
            Selected: <span className="font-semibold text-neutral-950">{templateLabel(selectedId)}</span>
            <span className="hidden sm:inline"> · You can change it later in the editor</span>
          </p>
        )}
        {/* Phones: Back at the left edge, Continue at the right. */}
        <div className="flex flex-1 sm:flex-none shrink-0 items-center justify-between sm:justify-end gap-2">
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
            className="ml-auto sm:ml-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-wait"
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
/** `afterReview`: the user already went through these (Tailor's gap review) and left them out. */
export function JobGaps({ gaps, afterReview = false }: { gaps: string[]; afterReview?: boolean }) {
  if (gaps.length === 0) return null;
  return (
    <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 text-left">
      <p className="text-sm font-semibold text-neutral-900">{afterReview ? "Still not covered by your CV" : "Not covered by your CV"}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
        {afterReview
          ? "You didn't add these. If you do have any of them, you can still add them in the editor."
          : "The job asks for these, but your CV doesn't show them. If you have any of them, add them in the editor."}
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

export interface MismatchOption {
  label: string;
  onClick: () => void;
}

/**
 * When the AI won't tailor a CV to a job because the job is in another field
 * (it never invents experience), the same dialog in every flow: what happened,
 * in plain words, what the job asks for, and what the user can do next.
 * `options[0]` is the main choice.
 */
export function JobMismatchDialog({
  mismatch,
  options,
  onClose,
}: {
  mismatch: GenerateCvMismatch | null;
  options: MismatchOption[];
  onClose: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  if (!mismatch) return null;
  const shownMissing = mismatch.missing.slice(0, 3);
  const moreMissing = mismatch.missing.slice(3, 10);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-neutral-950/40" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="job-mismatch-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
          <Compass className="h-5 w-5" />
        </span>
        <h2 id="job-mismatch-title" className="mt-4 text-lg font-bold tracking-tight text-neutral-950">
          This job is in a different field
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
          Your experience doesn&apos;t overlap with what this job asks for, and we only write what&apos;s true about you,
          so we can&apos;t tailor your CV to it.
        </p>
        {shownMissing.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-neutral-500">The job asks for</div>
            <ul className="mt-1.5 space-y-1">
              {shownMissing.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(mismatch.reason || moreMissing.length > 0) && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer"
              aria-expanded={showWhy}
            >
              {showWhy ? "Hide details" : moreMissing.length ? `Why, and ${moreMissing.length} more` : "Why?"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showWhy ? "rotate-180" : ""}`} />
            </button>
            {showWhy && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-neutral-50 border border-neutral-200 p-3 space-y-2">
                {mismatch.reason && <p className="text-xs leading-relaxed text-neutral-600">{mismatch.reason}</p>}
                {moreMissing.length > 0 && (
                  <ul className="space-y-1">
                    {moreMissing.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-neutral-600">
                        <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2">
          {options.map((option, i) => (
            <button
              key={option.label}
              type="button"
              onClick={option.onClick}
              className={
                i === 0
                  ? "w-full py-3 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                  : "w-full py-3 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              }
            >
              {option.label}
            </button>
          ))}
          {options.length === 0 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** What a finished flow says about job gaps, in its notice instead of an extra step. */
export function gapsNotice(gaps: string[]): string | undefined {
  if (gaps.length === 0) return undefined;
  const shown = gaps.slice(0, 3).join("; ");
  const more = gaps.length > 3 ? ` and ${gaps.length - 3} more` : "";
  return `Not on your CV yet: ${shown}${more}. Add any you have in the editor.`;
}

/** Runs `run` once, when it's rendered — for a step that has nothing left to show (e.g. a flow restored at its end). */
export function RunOnMount({ run }: { run: () => void }) {
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
  return null;
}
