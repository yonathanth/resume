// A /try flow handed over to the dashboard: Google sign-in had to take over
// the whole tab (its pop-up was blocked), so after signing in the dashboard
// reopens the flow they were in the middle of. While this is set, sign-in is
// a quiet spinner (no Moxie "Did you know?" — they're mid-task), and the
// onboarding questions wait until the flow is done: the CV they're making
// answers most of them (see completeOnboardingFromCv). Kept in sessionStorage,
// so it lives through the trip to Google and back in this tab only.

import type { FlowKind } from "./flow-drafts";

const KEY = "tryHandoff";
/** A handoff nobody picked up (they wandered off at Google) doesn't linger. */
const MAX_AGE_MS = 60 * 60 * 1000;

export function markTryHandoff(flow: FlowKind) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ flow, at: Date.now() }));
  } catch {
    // Storage blocked: the dashboard just treats them like any new account.
  }
}

export function peekTryHandoff(): FlowKind | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { flow, at } = JSON.parse(raw) as { flow: FlowKind; at: number };
    if (typeof at !== "number" || Date.now() - at > MAX_AGE_MS) {
      clearTryHandoff();
      return null;
    }
    return flow;
  } catch {
    return null;
  }
}

export function clearTryHandoff() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
