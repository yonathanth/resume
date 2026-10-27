// Which create / tailor / improve flow is open on the dashboard lives in its
// URL — /dashboard?flow=tailor&fs=… (plus &template=… or &profile=… for a
// CV started from one, &cv=… to tailor a saved CV) — so a refresh reopens it and Back closes it. The step
// inside it is ?step=… (see flow-steps). `fs` names this one opening of the
// flow: once it's closed or finished, Back onto its old steps shows the
// dashboard instead of reopening it empty. `from` is the dashboard page it was
// opened from (e.g. /dashboard/past-projects), so closing it goes back there.

import type { FlowKind } from "./flow-drafts";

export interface OpenFlow {
  kind: FlowKind;
  /** This opening of the flow. */
  session: string;
  /** The dashboard page it was opened from; closing it returns there. */
  from: string;
  template?: string;
  profile?: string;
  /** A saved CV to start from (Tailor). */
  cv?: string;
}

const KINDS: readonly FlowKind[] = ["create", "tailor", "improve"];
const CLOSED_KEY = "closedFlowSessions";

// Only other dashboard pages — never an outside URL from a crafted link.
function safeFrom(from: string | null | undefined): string {
  return from && /^\/dashboard\/[\w\-/]+$/.test(from) ? from : "/dashboard";
}

export function dashboardFlowHref(
  kind: FlowKind,
  options: { template?: string; profile?: string; cv?: string; from?: string } = {}
): string {
  const params = new URLSearchParams({ flow: kind, fs: Math.random().toString(36).slice(2, 10) });
  if (options.template) params.set("template", options.template);
  if (options.profile) params.set("profile", options.profile);
  if (options.cv) params.set("cv", options.cv);
  const from = safeFrom(options.from);
  if (from !== "/dashboard") params.set("from", from);
  return `/dashboard?${params.toString()}`;
}

export function readOpenFlow(params: URLSearchParams): OpenFlow | null {
  const kind = params.get("flow") as FlowKind | null;
  const session = params.get("fs");
  if (!kind || !KINDS.includes(kind) || !session) return null;
  return {
    kind,
    session,
    from: safeFrom(params.get("from")),
    template: params.get("template") ?? undefined,
    profile: params.get("profile") ?? undefined,
    cv: params.get("cv") ?? undefined,
  };
}

function closedSessions(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(CLOSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function markFlowClosed(session: string) {
  try {
    sessionStorage.setItem(CLOSED_KEY, JSON.stringify([...closedSessions(), session].slice(-50)));
  } catch {
    // Storage blocked: Back onto its steps just reopens it from the start.
  }
}

export function isFlowClosed(session: string): boolean {
  return closedSessions().includes(session);
}
