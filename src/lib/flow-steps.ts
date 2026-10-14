"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The step a create / tailor / improve flow is on lives in the URL (?step=…),
// so the browser's Back and Forward move between steps and a refresh lands on
// the same one. Only the step: what's typed and what the AI wrote stays out
// of the URL (see flow-drafts). Steps the AI is busy on are never written, so
// Back never lands on a loader; a step whose data isn't here (a shared link,
// storage cleared) falls back to the first step.

const STEP_PARAM = "step";

export interface FlowStepConfig<S extends string, D> {
  /** The flow's opening step — shown without a ?step= at all. */
  first: S;
  /** Every step's name in the URL (short and stable). */
  slugs: Record<S, string>;
  /** Steps that only last while the AI works, and the step each goes back to. Never written to the URL. */
  transient?: Partial<Record<S, S>>;
  /** Whether a step can show with this data (e.g. the questions need the CV the AI made). */
  available: (step: S, data: D | null) => boolean;
}

type StepNames<S extends string> = Pick<FlowStepConfig<S, never>, "first" | "slugs">;

function stepFromUrl<S extends string>(config: StepNames<S>): S | null {
  const slug = new URLSearchParams(window.location.search).get(STEP_PARAM);
  if (!slug) return null;
  const entry = (Object.entries(config.slugs) as [S, string][]).find(([, s]) => s === slug);
  return entry ? entry[0] : null;
}

function settle<S extends string, D>(config: FlowStepConfig<S, D>, step: S | null | undefined, data: D | null): S {
  const resolved = step ? (config.transient?.[step] ?? step) : config.first;
  return config.available(resolved, data) ? resolved : config.first;
}

function writeStep<S extends string>(config: StepNames<S>, step: S, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (step === config.first) url.searchParams.delete(STEP_PARAM);
  else url.searchParams.set(STEP_PARAM, config.slugs[step]);
  if (url.href === window.location.href) return;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

/**
 * A flow's step, kept in the URL. Starts from the URL's step (a refresh, or
 * Back/Forward) — or, with none there, the step its saved progress was on
 * (`restored`, e.g. back from checkout) — as long as its data can show it.
 * `goTo` moves on and adds a history entry; Back/Forward follow the URL,
 * checked against the data the flow last passed to `trackData` (call it in
 * an effect once its state is declared).
 */
export function useFlowStep<S extends string, D>(
  config: FlowStepConfig<S, D>,
  restored: { step: S; data: D } | null
): [S, (next: S) => void, (data: D) => void] {
  const [step, setStep] = useState<S>(() => settle(config, stepFromUrl(config) ?? restored?.step, restored?.data ?? null));

  // The URL says where it opened (normalising a fallen-back or restored step, without a new history entry).
  useEffect(() => {
    writeStep(config, step, "replace");
    // Only on opening; every later move writes its own entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back / Forward: follow the URL, with whatever data the flow has now.
  const latest = useRef(config);
  const data = useRef<D | null>(restored?.data ?? null);
  useEffect(() => {
    latest.current = config;
  });
  useEffect(() => {
    const onPopState = () => setStep(settle(latest.current, stepFromUrl(latest.current), data.current));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goTo = useCallback(
    (next: S) => {
      setStep(next);
      if (!latest.current.transient?.[next]) writeStep(latest.current, next, "push");
    },
    []
  );
  const trackData = useCallback((current: D) => {
    data.current = current;
  }, []);

  return [step, goTo, trackData];
}
