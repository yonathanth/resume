"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toaster";

// Unfinished create / tailor / improve flows, kept in this browser so a
// refresh — or coming back from checkout — picks up on the same step with
// everything still filled in. Not in the URL: a flow holds personal details
// (the job post, their story, their answers) that don't belong in history,
// logs or a link someone might share. What the AI already wrote lives on the
// server, in the flow's CV document; this only remembers which one it is.

export type FlowKind = "create" | "tailor" | "improve";

const KEY_PREFIX = "flowDraft:";
const KINDS: readonly FlowKind[] = ["create", "tailor", "improve"];
/** An unfinished flow from yesterday isn't worth reopening by surprise. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Saved<T> {
  savedAt: number;
  data: T;
}

function read<T>(kind: FlowKind): Saved<T> | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + kind);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved<T>;
    if (typeof saved.savedAt !== "number" || Date.now() - saved.savedAt > MAX_AGE_MS) {
      clearFlowDraft(kind);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function loadFlowDraft<T>(kind: FlowKind): T | null {
  return read<T>(kind)?.data ?? null;
}

export function clearFlowDraft(kind: FlowKind) {
  try {
    localStorage.removeItem(KEY_PREFIX + kind);
  } catch {
    // Nothing to clear.
  }
}

/** On log out: an unfinished CV mustn't be waiting for whoever uses this browser next. */
export function clearAllFlowDrafts() {
  KINDS.forEach(clearFlowDraft);
}

/** The most recently touched unfinished flow, if any — what the dashboard reopens. */
export function latestFlowDraft<T = unknown>(): { kind: FlowKind; data: T } | null {
  const found = KINDS.map((kind) => ({ kind, saved: read<T>(kind) }))
    .filter((f): f is { kind: FlowKind; saved: Saved<T> } => f.saved !== null)
    .sort((a, b) => b.saved.savedAt - a.saved.savedAt)[0];
  return found ? { kind: found.kind, data: found.saved.data } : null;
}

/**
 * What a flow had saved when it opened (null if nothing) — read once, before
 * its state, to start from. Pair with useSaveFlowDraft further down.
 */
export function useRestoredFlowDraft<T>(kind: FlowKind): T | null {
  const [restored] = useState(() => loadFlowDraft<T>(kind));
  const toast = useToast();
  const told = useRef(false);
  useEffect(() => {
    if (!restored || told.current) return;
    told.current = true;
    toast.success("Picked up where you left off", { id: "flow-restored", duration: 3000 });
  }, [restored, toast]);
  return restored;
}

/**
 * Keeps a flow's progress across a refresh: saves `snapshot` whenever it
 * changes while `active` (past the first step — back on it, there's nothing
 * worth keeping), and forgets it when the flow closes: ✕, finishing, or
 * leaving the page inside the app. A refresh never closes it, so the save
 * survives that.
 */
export function useSaveFlowDraft<T>(kind: FlowKind, snapshot: T, active: boolean) {
  const json = JSON.stringify(snapshot);

  useEffect(() => {
    try {
      if (active) localStorage.setItem(KEY_PREFIX + kind, JSON.stringify({ savedAt: Date.now(), data: JSON.parse(json) }));
      else clearFlowDraft(kind);
    } catch {
      // Storage full or blocked: progress just isn't kept across a refresh.
    }
  }, [kind, json, active]);

  useEffect(() => () => clearFlowDraft(kind), [kind]);
}
